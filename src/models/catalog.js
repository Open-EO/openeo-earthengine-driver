const Utils = require('../utils');
const fse = require('fs-extra');
const {Storage} = require('@google-cloud/storage');

// Rough auto mapping for common band names until GEE lists them.
// Optimized for Copernicus S2 data
const commonNames = {
	coastal: [0.40, 0.45],
	blue: [0.45, 0.50],
	yellow: [0.58, 0.62],
	green: [0.50, 0.60],
	red: [0.60, 0.70],
	pan: [0.50, 0.60], // 0.50, 0.70
	rededge: [0.70, 0.80], // 0.70, 0.75
	nir: [0.80, 0.85], // 0.75, 1.00
	nir08: [0.85, 0.94], //0.75, 0.90
	nir09: [0.94, 1.05], // 0.85, 1.05
	cirrus: [1.35, 1.40],
	swir16: [1.55, 1.75],
	swir22: [2.10, 2.30],
//  lwir: [10.5, 12.5],
	lwir11: [10.5, 11.5],
	lwir12: [11.5, 12.5]
};

module.exports = class DataCatalog {

	constructor() {
		this.dataFolder = 'storage/collections/';
		this.collections = {};
	}

	readLocalCatalog() {
		this.collections = {};
		var files = fse.readdirSync(this.dataFolder, {withFileTypes: true});
		for(var i in files) {
			let file = files[i];
			if (file.isFile() && file.name !== 'catalog.json') {
				let collection = fse.readJsonSync(this.dataFolder + file.name);
				if (collection.properties['gee:type'] === 'image_collection') {
					// We don't support ee.Image yet (see get_collection process), therefore ignore all non image collections.
					this.collections[collection.id] = collection;
				}
			}
		}
	}

	updateCatalog() {
		// To refresh the catalog manually, delete the catalog.json.
		let catalogFile = this.dataFolder + 'catalog.json';
		if (fse.existsSync(catalogFile)) {
			let fileTime = new Date(fse.statSync(catalogFile).ctime).getTime();
			let expiryTime = new Date().getTime() - 24 * 60 * 60 * 1000; // Expiry time: A day
			if (fileTime > expiryTime) {
				return Promise.resolve();
			}
		}

		console.info('Refreshing GEE catalog...');
		const storage = new Storage({
			keyFile: './privatekey.json'
		});
		const bucket = storage.bucket('earthengine-stac');
		const prefix = 'catalog/';
		return bucket.getFiles({
			prefix: prefix
		})
		.then(data => {
			let promises = [];
			for(var i in data[0]) {
				let file = data[0][i];
				promises.push(file.download({
					destination: this.dataFolder + file.name.replace(prefix, '')
				}));
			};
			return Promise.all(promises);
		});
	}

	loadCatalog() {
		return this.updateCatalog().then(() => {
			this.readLocalCatalog();
			console.info("Loaded catalog with " + Utils.size(this.collections) + " collections.");
			return Promise.resolve();
		});
	}

	getData(id = null) {
		if (id !== null) {
			if (typeof this.collections[id] !== 'undefined') {
				return this.collections[id];
			}
			else {
				return null;
			}
		}
		else {
			return Object.values(this.collections);
		}
	}

	fixData() {
		for(var i in this.collections) {
			let c = this.collections[i];

			// Fix invalid headers in markdown
			if (typeof c.description === 'string') {
				c.description = c.description.replace(/^(#){2,6}([^#\s].+)$/img, '$1 $2');
			}

			// Remove empty version field
			if (typeof c.version !== 'number' && !c.version) {
				delete c.version;
			}

			// The spatial extent is sometimes invalid, trying to fix them
			var x2 = c.extent.spatial.length > 4 ? 3 : 2;
			var minX = Math.min(c.extent.spatial[0], c.extent.spatial[x2]);
			c.extent.spatial[x2] = Math.max(c.extent.spatial[0], c.extent.spatial[x2]);
			c.extent.spatial[0] = minX;

			// Not a very useful information yet
			delete c.properties['gee:revisit_interval'];

			// Copy asset schema to other properties for now
			if (!Utils.isObject(c.other_properties)) {
				c.other_properties = {};
			}
			for(var j in c.properties['gee:asset_schema']) {
				var schema = c.properties['gee:asset_schema'][j];
				c.other_properties[schema.name] = {
					description: schema.description,
					type: schema.type
				};
			}
			delete c.properties['gee:asset_schema'];

			// Add common band names
			if (Array.isArray(c.properties['eo:bands'])) {
				for(var i in c.properties['eo:bands']) {
					var band = c.properties['eo:bands'][i];
					if (band.common_name || !band.center_wavelength) {
						continue;
					}

					for(var name in commonNames) {
						var wavelengths = commonNames[name];
						if (band.center_wavelength >= wavelengths[0] && band.center_wavelength < wavelengths[1]) {
							band.common_name = name;
							break;
						}
					}
					c.properties['eo:bands'][i] = band;
				}
			}

			// Add default dimensions
			var y2 = c.extent.spatial.length > 4 ? 4 : 3;
			c.properties['cube:dimensions'] = {
				x: {
					type: "spatial",
					axis: "x",
					extent: [c.extent.spatial[0], c.extent.spatial[x2]]
				},
				y: {
					type: "spatial",
					axis: "y",
					extent: [c.extent.spatial[1], c.extent.spatial[y2]]
				},
				t: {
					type: "temporal",
					extent: c.extent.temporal
				}
			};
			var bandNames = [];
			var bands = c.properties['eo:bands'] || c.properties['sar:bands'];
			for(var j in bands) {
				var b = bands[j];
				if (typeof b.name === 'string') {
					bandNames.push(b.name);
				}
			}
			if (bandNames.length > 0) {
				c.properties['cube:dimensions'].bands = {
				  type: "bands",
				  values: bandNames
				};
			}
			if (typeof c.properties['eo:epsg'] === 'number') {
				// Unfortunately, no other information available
				c.properties['cube:dimensions'].x.reference_system = c.properties['eo:epsg'];
				c.properties['cube:dimensions'].y.reference_system = c.properties['eo:epsg'];
			}

			c.links = c.links.map(l => {
				switch(l.rel) {
					case 'self':
						l.href = Utils.getApiUrl("/collections/" + c.id);
						break;
					case 'parent':
					case 'root':
						l.href = Utils.getApiUrl("/collections");
						break;
				}
				return l;
			});
			this.collections[i] = c;
		}
	}

};