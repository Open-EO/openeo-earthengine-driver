// import { DateTime } from 'luxon';
import API from "../utils/API.js";
import Utils from "../utils/utils.js";
import runSync from './worker/sync.js';

export default class Coverages {
	// OGC:CRS84 as WKT
	static CRS84_WKT = `GEOGCS["WGS 84 (CRS84)",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["OGC","CRS84"]]`;
	static DEFAULT_SCHEMA_NAME = "var";

	static addConformanceClasses(list) {
		return list.concat([
			"http://www.opengis.net/spec/ogcapi-coverages-1/1.0/conf/core",
			"http://www.opengis.net/spec/ogcapi-coverages-1/1.0/conf/geotiff",
			"http://www.opengis.net/spec/ogcapi-coverages-1/1.0/conf/png",
			"http://www.opengis.net/spec/ogcapi-coverages-1/1.0/conf/crs",
			"http://www.opengis.net/spec/ogcapi-coverages-1/1.0/conf/subsetting",
			"http://www.opengis.net/spec/ogcapi-coverages-1/1.0/conf/fieldselection",
		]);
	}

	static updateCollectionLink(link, cid) {
		switch(link.rel) {
			case 'http://www.opengis.net/def/rel/ogc/1.0/schema':
				link.href = API.getUrl(`/collections/${cid}/schema`);
				break;
			case 'http://www.opengis.net/def/rel/ogc/1.0/coverage':
				link.href = API.getUrl(`/collections/${cid}/coverage`);
				break;
		}
		return link;
	}

	static fixCollectionOnce(collection) {
		collection.extent.spatial.grid = [{},{}];
		collection.extent.spatial.storageCrsBbox = [];
		collection.extent.temporal.grid = {};

		if (Array.isArray(collection.summaries['proj:epsg']) && typeof collection.summaries['proj:epsg'][0] === 'number') {
			collection.storageCrs = `http://www.opengis.net/def/crs/EPSG/0/${collection.summaries['proj:epsg'][0]}`;
			collection.crs = [
				"EPSG:4326"
			];
		}

		collection.links.push({
			rel: "http://www.opengis.net/def/rel/ogc/1.0/schema",
			href: `/collections/${collection.id}/schema`,
			type: "application/schema+json"
		});
		collection.links.push({
			rel: "http://www.opengis.net/def/rel/ogc/1.0/coverage",
			href: `/collections/${collection.id}/coverage`,
			type: "image/png"
		});
		collection.links.push({
			rel: "http://www.opengis.net/def/rel/ogc/1.0/coverage",
			href: `/collections/${collection.id}/coverage`,
			type: "image/tiff; application=geotiff"
		});

		return collection;
	}

	static getProperties(collection) {
		return collection.summaries['eo:bands']
			|| collection.summaries['sar:bands']
			|| [{name: Coverages.DEFAULT_SCHEMA_NAME}];
	}

	static getSchema(collection) {
		const bands = Coverages.getProperties(collection);
		const properties = {};
		for(let i = 0; i < bands.length; i++) {
			const band = Object.assign({}, bands[i]);
			const id = band.name || String(i);
			delete band.name;
			band.type = "number";
			band.title = id;
			band["x-ogc-propertySeq"] = i;
			properties[id] = band;
		}
		const jsonSchema = {
			$schema : "https://json-schema.org/draft/2020-12/schema",
			$id : API.getUrl(`/collections/${collection.id}/schema`),
			title : "Schema",
			type : "object",
			properties,
			additionalProperties: false
		};
		return jsonSchema;
	}

	static updateCollection(collection) {
		collection.links.push({
			rel: "http://www.opengis.net/def/rel/ogc/1.0/schema",
			href: API.getUrl(`/collections/${collection.id}/schema`),
			type: "application/schema+json"
		});
		collection.links.push({
			rel: "http://www.opengis.net/def/rel/ogc/1.0/coverage",
			href: API.getUrl(`/collections/${collection.id}/schema`),
			type: "image/png"
		});
		return collection;
	}

	constructor(collection) {
		this.collection = collection;
		this.crs = "EPSG:4326";
		this.bbox = null;
		this.datetime = [];
		this.properties = [];
	}

	setSubset(subsets/* = [], crs = null*/) {
		if (subsets) {
			throw new Error("Not supported yet, see https://github.com/opengeospatial/ogcapi-coverages/issues/194");
		}
	}

	setBoundingBox(bbox = null, crs = null) {
		if (!bbox) {
			this.bbox = null;
			return;
		}

		if (typeof bbox === 'string') {
			bbox = bbox.split(",").map(b => parseFloat(b.trim()));
		}
		if (!Array.isArray(bbox)) {
			throw new Error("Invalid input");
		}
		else if (bbox.length !== 4) {
			throw new Error("Invalid number of coordinates");
		}
		this.bbox = {
			west: bbox[0],
			south: bbox[1],
			east: bbox[2],
			north: bbox[3],
			crs: Coverages.checkCrs(crs)
		};
	}

	setDatetime(datetime = null) {
		if (!datetime) {
			this.datetime = null;
			return;
		}

		if (typeof datetime === 'string') {
			if (datetime.includes("/")) {
				datetime = datetime.split("/");
			}
			else {
				datetime = [datetime, datetime];
			}
		}
		if (!Array.isArray(datetime) || datetime.length !== 2) {
			throw new Error("Invalid input, needs two datetimes or an open range");
		}

		datetime = datetime.map(dt => ((dt === '' || dt === '..') ? null : dt));

		// if (datetime.find(dt => dt !== null && !DateTime.fromISO(dt, {zone: "utc"}).IsValid)) {
		// 	throw new Error("Invalid datetime(s) specififed");
		// }

		if (datetime[0] === null && this.datetime[1] === null) {
			this.datetime = null;
		}
		else {
			this.datetime = datetime;
		}
	}

	setFields(properties = []) {
		if (typeof properties === 'string') {
			properties = properties.split(",");
		}
		if (!Array.isArray(properties)) {
			throw new Error("Invalid input");
		}

		const bands = Coverages.getProperties(this.collection);
		const bandNames = bands.map(b => b.name);

		properties = properties
			.map(p => {
				p = p.trim();
				if (p.match(/^[0-9]+$/)) {
					p = parseInt(p, 10);
					if (p < 0 || p >= bands.length) {
						return null;
					}
					p = bandNames[p];
				}
				else if (p !== Coverages.DEFAULT_SCHEMA_NAME && !bandNames.includes(p)) {
					return null;
				}
				return p;
			})
			.filter(p => (p !== Coverages.DEFAULT_SCHEMA_NAME));

		if (properties.find(p => p === null)) {
			throw new Error("Invalid band specified");
		}
		if (properties.find(p => p === '*')) {
			throw new Error("Wildcard * not supported, see https://github.com/opengeospatial/ogcapi-coverages/issues/188");
		}

		if (properties.length > 0) {
			this.properties = properties;
		}
		else {
			this.properties = null;
		}
	}

	setFileFormat(format = null) {
		this.format = format || "PNG";
	}

	static checkCrs(crs) {
		if (!crs) {
			crs = "EPSG:4326";
		}
		if (!crs.startsWith("EPSG:")) {
			throw new Error("Only EPSG codes are supported");
		}
		return parseInt(crs.replace("EPSG:", ""), 10);
	}

	setCrs(crs) {
		this.crs = Coverages.checkCrs(crs);
	}

	async execute(context, req) {
		const process_graph = {
			loadcollection: {
				process_id: "load_collection",
				arguments: {
					id: this.collection.id,
					temporal_extent: this.datetime,
					spatial_extent: this.bbox,
					bands: this.properties
				}
			},
			saveresult: {
				process_id: "save_result",
				arguments: {
					data: { from_node: "loadcollection" },
					format: this.format,
					options: {
						epsgCode: this.crs
					}
				},
				result: true
			}
		};

		const id = Utils.timeId();
		return await runSync(context, req.user, id, {process_graph}, "error");
	}

}
