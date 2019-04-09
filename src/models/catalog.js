const Utils = require('../utils');
const fse = require('fs-extra');
const {Storage} = require('@google-cloud/storage');

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
			c.stac_version = "0.6.2";

			// The spatial extent is sometimes invalid, trying to fix them
			var x2 = c.extent.spatial.length > 4 ? 3 : 2;
			var minX = Math.min(c.extent.spatial[0], c.extent.spatial[x2]);
			c.extent.spatial[x2] = Math.max(c.extent.spatial[0], c.extent.spatial[x2]);
			c.extent.spatial[0] = minX;

			// Remove the invalid gsd entry from the bands
			if (Array.isArray(c.properties["eo:bands"])) {
				for(let i in c.properties["eo:bands"]) {
					// This entry currently holds invalid information
					delete c.properties["eo:bands"][i].gsd;
				}
			}

			// Not a very useful information yet
			delete c.properties['gee:revisit_interval'];

			// Copy asset schema to other properties for now
			c.other_properties = {};
			for(var i in c.properties['gee:asset_schema']) {
				var schema = c.properties['gee:asset_schema'][i];
				c.other_properties[schema.name] = {
					description: schema.description,
					type: schema.type
				};
			}
			delete c.properties['gee:asset_schema'];

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
				temporal: {
					type: "temporal",
					extent: c.extent.temporal
				}
			};
			var bandNames = [];
			for(var i in c.properties['eo:bands']) {
				var b = c.properties['eo:bands'][i];
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