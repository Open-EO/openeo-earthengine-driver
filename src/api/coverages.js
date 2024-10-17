import API from "../utils/API.js";

export default class Coverages {

	// OGC:CRS84 as WKT
	static CRS84_WKT = `GEOGCS["WGS 84 (CRS84)",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["OGC","CRS84"]]`;

	static addConformanceClasses(list) {
		return list.concat([
			"http://www.opengis.net/spec/ogcapi-coverages-1/1.0/conf/core",
			"http://www.opengis.net/spec/ogcapi-coverages-1/1.0/conf/geotiff",
			"http://www.opengis.net/spec/ogcapi-coverages-1/1.0/conf/png",
			"http://www.opengis.net/spec/ogcapi-coverages-1/1.0/conf/crs",
			"http://www.opengis.net/spec/ogcapi-coverages-1/1.0/conf/scaling",
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

		return collection;
	}

	static getSchema(collection) {
		const jsonSchema = {
			"$schema" : "https://json-schema.org/draft/2019-09/schema",
			"$id" : API.getUrl(`/collections/${collection.id}/schema`),
			"title" : "Schema",
			"type" : "object",
			"properties" : {
				"var": {
					"title": "",
					"type": "number",
					"description": "",
					"x-ogc-propertySeq": 0
				}
			},
			"additionalProperties": false
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

	constructor() {

	}

	setSubset(subsets = [], crs = Coverages.CRS84_WKT) {
		if (typeof subsets === 'string') {
			subsets = [subsets];
		}
		if (subsets.length > 0) {
			throw new Error("Not supported");
		}
		this.subsets = subsets;
		this.subsetCrs = crs;
	}

	setScaleAxes(axes = []) {
		if (typeof axes === 'string') {
			axes = [axes];
		}
		if (axes.length > 0) {
			throw new Error("Not supported");
		}
		this.scaleAxes = axes;
	}

	setScaleFactor(factor) {
		this.scaleFactor = parseFloat(factor) || 1;
	}

	setScaleSize(sizes) {
		if (typeof sizes === 'string') {
			sizes = [sizes];
		}
		if (sizes.length > 0) {
			throw new Error("Not supported");
		}
		this.scaleSizes = sizes;
	}

	setDimensions(w, h) {
		this.width = parseInt(w, 10) || null;
		this.height = parseInt(h, 10) || null;
	}

	setBoundingBox(bbox = null, crs = Coverages.CRS84_WKT) {
		if (typeof bbox === 'string') {
			bbox = bbox.split(",");
		}
		this.bbox = bbox;
		if (this.bbox.length !== 4) {
			throw new Error("Invalid number of coordinates");
		}
		this.bboxCrs = crs;
	}

	setDatetime(datetime = null) {
		if (typeof datetime === 'string') {
			if (datetime.includes("/")) {
				datetime = datetime.split("/");
			}
			else {
				datetime = [datetime];
			}
		}
		this.datetime = datetime;
	}

	setFileFormat(format = "PNG") {
		this.format = format;
	}

	setCrs(crs) {
		this.crs = crs;
	}

	async execute() {

	}

}
