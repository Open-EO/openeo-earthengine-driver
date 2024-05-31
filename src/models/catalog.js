import Utils from '../utils/utils.js';
import fse from 'fs-extra';
import path from 'path';
import ItemStore from './itemstore.js';
import { Storage } from '@google-cloud/storage';
import API from '../utils/API.js';

const STAC_EXTENSIONS = {
	cube: "https://stac-extensions.github.io/datacube/v2.2.0/schema.json",
	eo: "https://stac-extensions.github.io/eo/v1.1.0/schema.json",
	proj: "https://stac-extensions.github.io/projection/v1.1.0/schema.json",
	raster: "https://stac-extensions.github.io/raster/v1.1.0/schema.json",
	version: "https://stac-extensions.github.io/version/v1.0.0/schema.json"
};

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

const geeSchemaMapping = {
	STRING: {
		type: "string"
	},
	DOUBLE: {
		type: "number"
	},
	INT: {
		type: "integer"
	},
	STRING_LIST: {
		type: "array",
		items: {
			type: "string"
		}
	},
	INT_LIST: {
		type: "array",
		items: {
			type: "integer"
		}
	}
};

const geeDataTypeMapping = {
	int: [
		{
			name: "int8",
			min: -128,
			max: 127
		},
		{
			name: "uint8",
			min: 0,
			max: 255
		},
		{
			name: "int16",
			min: -32768,
			max: 32767,
		},
		{
			name: "uint16",
			min: 0,
			max: 65535,
		},
		{
			name: "int32",
			min: -2147483648,
			max: 2147483647,
		},
		{
			name: "uint32",
			min: 0,
			max: 4294967295,
		}
	],
	float: "float32",
	double: "float64"
};

export default class DataCatalog {

	constructor(context) {
		this.dataFolder = 'storage/collections/';
		this.collections = {};
		this.supportedGeeTypes = ['image', 'image_collection'];
		this.serverContext = context;
		this.itemCache = new ItemStore();
	}

	async readLocalCatalog() {
		await fse.ensureDir(this.dataFolder);
		this.collections = {};
		const files = await fse.readdir(this.dataFolder, { withFileTypes: true });
		const promises = files.map(async (file) => {
			const name = path.basename(file.name);
			if (file.isFile() && name.endsWith('.json')) {
				try {
					const obj = await fse.readJson(this.dataFolder + name);
					if (obj.type !== 'Collection') {
						return;
					}
					const collection = this.fixCollectionOnce(obj);
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
		await fse.ensureDir(this.dataFolder);

		const syncTimeFile = this.dataFolder + 'sync.txt';
		if (!force) {
			let syncTime;
			try {
				syncTime = parseInt(await fse.readFile(syncTimeFile, 'utf8'), 10);
			} catch (e) {
				syncTime = 0;
			}
			const expiryTime = Date.now() - 24 * 60 * 60 * 1000; // Expiry time: A day
			if (syncTime > expiryTime) {
				return;
			}
		}

		await this.itemCache.clear();

		const storage = new Storage({
			keyFile: this.serverContext.serviceAccountCredentialsFile || null
		});
		const bucket = storage.bucket('earthengine-stac');
		const prefix = 'catalog/';
		const data = await bucket.getFiles({ prefix });

		await fse.emptyDir(this.dataFolder);
		const promises = data[0].map(async file => {
			if (file.name.endsWith('catalog.json') || !file.name.endsWith('.json')) {
				return;
			}
			const destination = this.dataFolder + path.basename(path.dirname(file.name)) + '_' + path.basename(file.name);
			await file.download({ destination, validation: 'md5' });
			try {
				await fse.readJSON(destination);
			} catch (e) {
				if (await fse.exists(destination)) {
					fse.unlink(destination);
				}
				console.error("Received invalid JSON file: " + destination);
			}
		});
		await Promise.all(promises);
		await fse.writeFile(syncTimeFile, Date.now().toString());
	}

	async loadCatalog() {
		await this.updateCatalog();
		return await this.readLocalCatalog();
	}

	getSchema(id) {
		const collection = this.getData(id, true);
		if (!collection) {
			return null;
		}

		const geeSchemas = collection.summaries['gee:schema'] || [];
		const jsonSchema = {
			"$schema" : "https://json-schema.org/draft/2019-09/schema",
			"$id" : API.getUrl(`/collections/${id}/queryables`),
			"title" : "Queryables",
			"type" : "object",
			"properties" : {},
			"additionalProperties": false
		};
		if (!Array.isArray(geeSchemas)) {
			return jsonSchema;
		}

		for(const geeSchema of geeSchemas) {
			const s = {
				description: geeSchema.description || ""
			};
			Object.assign(s, geeSchemaMapping[geeSchema.type] || {});
			jsonSchema.properties[geeSchema.name] = s;
		}

		return jsonSchema;
	}

	getData(id = null, withSchema = false) {
		if (id !== null) {
			if (typeof this.collections[id] !== 'undefined') {
				return this.updateCollection(this.collections[id], withSchema);
			}
			else {
				return null;
			}
		}
		else {
			return Object.values(this.collections).map(c => this.updateCollection(c, withSchema));
		}
	}

	getImageVisualization(id) {
		const c = this.getData(id);
		if (Array.isArray(c.summaries['gee:visualizations'])) {
			let vis = c.summaries['gee:visualizations'];
			if (vis.length > 0) {
				return vis[0].image_visualization || null;
			}
		}
		return null;
	}

	updateCollection(c, withSchema = false) {
		c = Object.assign({}, c);
		if (!withSchema) {
			c.summaries = Utils.omitFromObject(c.summaries, ['gee:schema']);
		}
		c.links = c.links.slice(0);
		c.links = c.links.map(l => {
			l = Object.assign({}, l);
			switch(l.rel) {
				case 'self':
					l.href = API.getUrl("/collections/" + c.id);
					break;
				case 'parent':
					l.href = API.getUrl("/");
					break;
				case 'root':
					l.href = API.getUrl("/");
					break;
			}
			return l;
		});
		c.links.push({
			rel: 'http://www.opengis.net/def/rel/ogc/1.0/queryables',
			href: API.getUrl(`/collections/${c.id}/queryables`),
			title: "Queryables",
			type: "application/schema+json"
		});
		if (c["gee:type"] === 'image_collection') {
			c.links.push({
				rel: 'items',
				href: API.getUrl(`/collections/${c.id}/items`),
				type: "application/geo+json"
			});
		}
		return c;
	}

	convertImageToStac(img, collection) {
		const omitProperties = [
			"system:footprint",
			"system:asset_size",
			"system:index",
			"system:time_start",
			"system:time_end"
		];
		const extensions = new Set();

		const id = img.properties["system:index"];
		let geometry = null;
		let bbox;
		if (img.properties["system:footprint"]) {
			geometry = {
				type: "Polygon",
				coordinates: [img.properties["system:footprint"].coordinates]
			};
			bbox = Utils.geoJsonBbox(geometry, true);
		}

		const geeSchemas = collection.summaries['gee:schema'] || [];
		const stacPropertyMapping = {};
		for (const schema of geeSchemas) {
			if (schema.stac_name) {
				stacPropertyMapping[schema.name] = schema.stac_name;
			}
		}

		const properties = {};
		for(const key in img.properties) {
			if (!omitProperties.includes(key)) {
				let newKey;
				if (stacPropertyMapping[key]) {
					newKey = stacPropertyMapping[key];
					if (newKey.includes(":")) {
						const extPrefix = newKey.split(":")[0];
						if (STAC_EXTENSIONS[extPrefix]) {
							extensions.add(STAC_EXTENSIONS[extPrefix]);
						}
					}
				}
				else if (!key.includes(":")) {
					newKey = `gee:${key.toLowerCase()}`;
				}
				else {
					newKey = key.toLowerCase();
				}
				properties[newKey] = img.properties[key];
			}
		}

		properties.datetime = Utils.toISODate(img.properties["system:time_start"]);
		if (img.properties["system:time_end"]) {
			properties.start_datetime = Utils.toISODate(img.properties["system:time_start"]);
			properties.end_datetime = Utils.toISODate(img.properties["system:time_end"]);
		}

		extensions.add(STAC_EXTENSIONS.version);
		properties.version = String(img.version);

		const hasBands = Array.isArray(img.bands) && img.bands.length > 0;
		const collectionBands = collection.summaries['eo:bands'] || [];
		// Is it a spectral band or SAR?
		const isEO = hasBands && collectionBands.some(band => {
			const keys = Object.keys(band);
			console.log(keys);
			return keys.includes("common_name") || keys.includes("center_wavelength") || keys.includes("full_width_half_max");
		})
		const bandMap = {};
		for(const band of collectionBands) {
			bandMap[band.name] = band;
		}
		if (hasBands && isEO) {
			extensions.add(STAC_EXTENSIONS.eo);
			properties["eo:bands"] = img.bands.map(band => Object.assign({name: band.id}, bandMap[band.id]));
		}

		const links = [
			{
				rel: "self",
				href: API.getUrl(`/collections/${collection.id}/items/${id}`),
				type: "application/geo+json"
			},
			{
				rel: "root",
				href: API.getUrl(`/`),
				type: "application/json"
			},
			{
				rel: "parent",
				href: API.getUrl(`/collections/${collection.id}`),
				type: "application/json"
			},
			{
				rel: "collection",
				href: API.getUrl(`/collections/${collection.id}`),
				type: "application/json"
			}
		];

		const assets = {
			thumbnail: {
				href: API.getUrl(`/thumbnails/${img.id}`),
				type: "image/jpeg",
				roles: ["thumbnail", "overview"]
			}
		};

		if (hasBands) {
			for (const imgBand of img.bands) {
				// Base asset for the band
				const asset = {
					href: API.getUrl(`/assets/${img.id}?band=${imgBand.id}`),
					type: "image/tiff; application=geotiff",
					roles: ["data"]
				};

				// Projection
				if (imgBand.crs_transform) {
					extensions.add(STAC_EXTENSIONS.proj);
					asset["proj:transform"] = imgBand.crs_transform;
				}
				if (imgBand.dimensions) {
					extensions.add(STAC_EXTENSIONS.proj);
					const largerIndex = imgBand.dimensions[0] > imgBand.dimensions[1] ? 0 : 1;
					const ratio = imgBand.dimensions[largerIndex] / this.serverContext.stacAssetDownloadSize;
					const x = Math.round(imgBand.dimensions[0] / ratio);
					const y = Math.round(imgBand.dimensions[1] / ratio);
					asset["proj:shape"] = [y, x];
				}
				if (imgBand.crs) {
					if (imgBand.crs.startsWith("EPSG:")) {
						extensions.add(STAC_EXTENSIONS.proj);
						asset["proj:epsg"] = parseInt(imgBand.crs.substring(5), 10);
					}
					else {
						asset["gee:crs"] = imgBand.crs;
					}
				}

				const baseBand = bandMap[imgBand.id] || {};
				// Move gsd to asset
				if (baseBand.gsd) {
					asset.gsd = baseBand.gsd;
				}

				// EO bands
				if (baseBand && isEO) {
					asset["eo:bands"] = [
						Utils.pickFromObject(baseBand, ["name", "description", "common_name", "center_wavelength", "full_width_half_max"])
					];
				}

				// Raster bands
				let rasterBand = baseBand;
				if (isEO) {
					rasterBand = {
						name: rasterBand.name,
						scale: rasterBand["gee:scale"],
						offset: rasterBand["gee:offset"]
					};
				}
				const dataType = this.getDataTypeFromPixelType(imgBand.data_type);
				if (dataType) {
					rasterBand.data_type = dataType;
				}
				// It should contain more than just a name property
				if (Utils.size(rasterBand) > 1) {
					extensions.add(STAC_EXTENSIONS.raster);
					asset["raster:bands"] = [rasterBand];
				}

				// Add asset
				assets[imgBand.id] = asset;
			}
		}
		else {
			assets.data = {
				href: API.getUrl(`/assets/${img.id}`),
				type: "image/tiff; application=geotiff",
				roles: ["data"]
			};
		}

		const stac = {
			stac_version: "1.0.0",
			stac_extensions: Array.from(extensions),
			type: "Feature",
			id,
			bbox,
			geometry,
			properties,
			collection: collection.id,
			links,
			assets
		};

		return stac;
	}

	getDataTypeFromPixelType(geeDataType) {
		if (Utils.isObject(geeDataType) && geeDataType.type === "PixelType") {
			const types = geeDataTypeMapping[geeDataType.precision];
			if (Array.isArray(types)) {
				for(const type of types) {
					if (geeDataType.min === type.min && geeDataType.max === type.max) {
						return type.name;
					}
				}
			}
			else if (typeof types === 'string') {
				return types;
			}
		}
		return null;
	}

	fixCollectionOnce(c) {
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

		// Fix invalid summaries
		for(const key in c.summaries) {
			const summary = c.summaries[key];
			if (!Utils.isObject(summary) && !Array.isArray(summary)) {
				c.summaries[key] = [summary];
			}
		}

		// Add common band names
		if (Array.isArray(c.summaries['eo:bands'])) {
			for(const i in c.summaries['eo:bands']) {
				const band = c.summaries['eo:bands'][i];
				if (band.common_name || !band.center_wavelength) {
					continue;
				}

				for(const name in commonNames) {
					const wavelengths = commonNames[name];
					if (band.center_wavelength >= wavelengths[0] && band.center_wavelength < wavelengths[1]) {
						band.common_name = name;
						break;
					}
				}
				c.summaries['eo:bands'][i] = band;
			}
		}

		c.stac_extensions = [STAC_EXTENSIONS.cube];

		if (!c.extent || !c.extent.spatial || !c.extent.spatial.bbox) {
			console.log("Invalid spatial extent for " + c.id);
		}
		else {
			// spatial dimensions for all data types
			const x2 = c.extent.spatial.bbox[0].length > 4 ? 3 : 2;
			const y2 = c.extent.spatial.bbox[0].length > 4 ? 4 : 3;
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
			};
		}

		// temporal dimension only for image collections
		if (c['gee:type'] === 'image_collection') {
			c['cube:dimensions'].t = {
				type: "temporal",
				extent: c.extent.temporal.interval[0]
			}
		}

		// bands for all images and image collections
		const bands = c.summaries['eo:bands'] || c.summaries['sar:bands'] || [];
		const bandNames = bands
			.filter(b => typeof b.name === 'string')
			.map(b => b.name);
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

}
