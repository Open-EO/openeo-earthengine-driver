const Utils = require('../utils/utils');
const fse = require('fs-extra');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

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

	constructor(context) {
		this.dataFolder = 'storage/collections/';
		this.collections = {};
		this.supportedGeeTypes = ['image', 'image_collection'];
		this.serverContext = context;
	}

	async readLocalCatalog() {
		this.collections = {};
		const files = await fse.readdir(this.dataFolder, { withFileTypes: true });
		const promises = files.map(async (file) => {
			const name = path.basename(file.name);
			if (file.isFile() && name.endsWith('.json') && name !== 'catalog.json') {
				try {
					let collection = await fse.readJson(this.dataFolder + name);
					collection = this.fixData(collection);
					if (this.supportedGeeTypes.includes(collection['gee:type'])) {
						this.collections[collection.id] = collection;
					}
				} catch (error) {
					console.error(error);
				}
			}
		});
		await Promise.all(promises);
		return Utils.size(this.collections);
	}

	async updateCatalog(force = false) {
		// To refresh the catalog manually, delete the catalog.json or set force to true
		const catalogFile = this.dataFolder + 'catalog.json';
		if (!force && await fse.exists(catalogFile)) {
			const stat = await fse.stat(catalogFile);
			const fileTime = new Date(stat.ctime).getTime();
			const expiryTime = new Date().getTime() - 24 * 60 * 60 * 1000; // Expiry time: A day
			if (fileTime > expiryTime) {
				return;
			}
		}

		const storage = new Storage({
			keyFile: './privatekey.json',
			projectId: this.serverContext.googleProjectId
		});
		const bucket = storage.bucket('earthengine-stac');
		const prefix = 'catalog/';
		const data = await bucket.getFiles({ prefix });

		await fse.emptyDir(this.dataFolder);
		const promises = data[0].map(async file => {
			if (!file.name.endsWith('.json')) {
				return;
			}
			const destination = this.dataFolder + path.basename(file.name);
			await file.download({ destination, validation: 'md5' });
			try {
				await fse.readJSON(destination);
			} catch (e) {
				await file.download({ destination, validation: 'crc32cs' });
			}
		});
		return await Promise.all(promises);
	}

	async loadCatalog() {
		await this.updateCatalog();
		return await this.readLocalCatalog();
	}

	getData(id = null) {
		if (id !== null) {
			if (typeof this.collections[id] !== 'undefined') {
				return this.fixLinks(this.collections[id]);
			}
			else {
				return null;
			}
		}
		else {
			return Object.values(this.collections).map(c => this.fixLinks(c));
		}
	}

	fixLinks(c) {
		c.links = c.links.map(l => {
			switch(l.rel) {
				case 'self':
					l.href = Utils.getApiUrl("/collections/" + c.id);
					break;
				case 'parent':
					l.href = Utils.getApiUrl("/collections");
					break;
				case 'root':
					l.href = Utils.getApiUrl("/");
					break;
			}
			return l;
		});
		c.links.push({
			rel: 'http://www.opengis.net/def/rel/ogc/1.0/queryables',
			href: Utils.getApiUrl(`/collections/${c.id}/queryables`),
			title: "Queryables",
			type: "application/schema+json"
		});
		return c;
	}

	fixData(c) {
		// Fix invalid headers in markdown
		if (typeof c.description === 'string') {
			c.description = c.description.replace(/^(#){2,6}([^#\s].+)$/img, '$1 $2');
		}

		// Remove empty version field
		if (typeof c.version !== 'string' || c.version.length === 0 || c.version === "Unknown") {
			delete c.version;
		}

		if (!Utils.isObject(c.summaries)) {
			c.summaries = {};
		}

		// Not a very useful information yet
		delete c.summaries['gee:visualizations'];

		// Fix invalid summaries
		for(let key in c.summaries) {
			let summary = c.summaries[key];
			if (!Utils.isObject(summary) && !Array.isArray(summary)) {
				c.summaries[key] = [summary];
			}
		}

		// Add common band names
		if (Array.isArray(c.summaries['eo:bands'])) {
			for(var i in c.summaries['eo:bands']) {
				var band = c.summaries['eo:bands'][i];
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
				c.summaries['eo:bands'][i] = band;
			}
		}

		var x2 = c.extent.spatial.bbox[0].length > 4 ? 3 : 2;
		var y2 = c.extent.spatial.bbox[0].length > 4 ? 4 : 3;
		c.stac_extensions = ["datacube"];
		c['cube:dimensions'] = {
			x: {
				type: "spatial",
				axis: "x",
				extent: [c.extent.spatial.bbox[0][0], c.extent.spatial.bbox[0][x2]]
			},
			y: {
				type: "spatial",
				axis: "y",
				extent: [c.extent.spatial.bbox[0][1], c.extent.spatial.bbox[0][y2]]
			},
			// ToDo metadata: Dimension t should not apply for ee.Image (applies only for ee.ImageCollection) #80
			t: {
				type: "temporal",
				extent: c.extent.temporal.interval[0]
			}
		};
		var bandNames = [];
		var bands = c.summaries['eo:bands'] || c.summaries['sar:bands'];
		for(var j in bands) {
			var b = bands[j];
			if (typeof b.name === 'string') {
				bandNames.push(b.name);
			}
		}
		if (bandNames.length > 0) {
			c['cube:dimensions'].bands = {
				type: "bands",
				values: bandNames
			};
		}
		if (Array.isArray(c.summaries['proj:epsg']) && typeof c.summaries['proj:epsg'][0] === 'number') {
			// Unfortunately, no other information available
			c['cube:dimensions'].x.reference_system = c.summaries['proj:epsg'][0];
			c['cube:dimensions'].y.reference_system = c.summaries['proj:epsg'][0];
		}

		if (!Utils.isObject(c.assets)) {
			c.assets = {};
		}

		// Convert preview links to collection assets
		c.links.forEach((l,i) => {
			switch(l.rel) {
				case 'preview':
					c.assets['preview_' + i] = Object.assign({}, l, {
						roles: ['thumbnail']
					});
					delete c.assets['preview_' + i].rel;
					break;
			}
		});

		return c;
	}

};