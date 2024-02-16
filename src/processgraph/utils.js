import Utils from "../utils/utils.js";

// ComputedObject is returned by the following functions:
// ee.Algorithms.If, ee.Directory.get, ee.List.get, ee.String.decodeJSON, ee.apply, aside, iterate
// Potentially also ee.Algorithms.Describe, ee.List.reduce
// https://issuetracker.google.com/issues/325444873

const GeeUtils = {

	getEarthEngineType(ee, obj, returnComputedObject = false) {
		if (!Utils.isObject(obj)) {
			return null;
		}
		if (obj instanceof ee.ComputedObject && returnComputedObject) {
			return "ComputedObject";
		}
		else if (obj instanceof ee.Array) {
			return "Array";
		}
		else if (obj instanceof ee.Blob) {
			return "Blob";
		}
		else if (obj instanceof ee.Date) {
			return "Date";
		}
		else if (obj instanceof ee.DateRange) {
			return "DateRange";
		}
		else if (obj instanceof ee.Dictionary) {
			return "Dictionary";
		}
		else if (obj instanceof ee.Feature) {
			return "Feature";
		}
		else if (obj instanceof ee.FeatureCollection) {
			return "FeatureCollection";
		}
		else if (obj instanceof ee.Geometry) {
			return "Geometry";
		}
		else if (obj instanceof ee.Image) {
			return "Image";
		}
		else if (obj instanceof ee.ImageCollection) {
			return "ImageCollection";
		}
		else if (obj instanceof ee.List) {
			return "List";
		}
		else if (obj instanceof ee.Number) {
			return "Number";
		}
		else if (obj instanceof ee.String) {
			return "String";
		}
		return null;
	},

	isEarthEngineType(ee, obj) {
		return Utils.isObject(obj) && (
			obj instanceof ee.ComputedObject ||
			obj instanceof ee.Array ||
			obj instanceof ee.Blob ||
			obj instanceof ee.Date ||
			obj instanceof ee.DateRange ||
			obj instanceof ee.Dictionary ||
			obj instanceof ee.Feature ||
			obj instanceof ee.FeatureCollection ||
			obj instanceof ee.Geometry ||
			obj instanceof ee.Image ||
			obj instanceof ee.ImageCollection ||
			obj instanceof ee.List ||
			obj instanceof ee.Number ||
			obj instanceof ee.String
		);
	},

	isNumType(ee, obj) {
		return Utils.isObject(obj) && (
			obj instanceof ee.Number ||
			obj instanceof ee.Image ||
			obj instanceof ee.Array
		);
	},

	isNumArrayType(ee, obj) {
		return Utils.isObject(obj) && (
			obj instanceof ee.Image ||
			obj instanceof ee.Array
		);
	},

	isSameNumType(ee, a, b) {
		return Utils.isObject(a) && Utils.isObject(b) (
			(a instanceof ee.Number && b instanceof ee.Number) ||
			(a instanceof ee.Image && b instanceof ee.Image) ||
			(a instanceof ee.Array && b instanceof ee.Array)
		);
	},

	applyBinaryNumFunction(node, func, xParameter = "x", yParameter = "y") {
		const ee = node.ee;
		const x = node.getArgumentAsEE(xParameter);
		const y = node.getArgumentAsEE(yParameter);

		const eeFunc = (a, b) => {
			if (this.isSameNumType(a, b)) {
				return func(a, b);
			}
			else if (this.isNumType(a) && b instanceof ee.Number) {
				return func(a, b);
			}
			else if (a instanceof ee.Image) {
				return func(a, ee.Image(b));
			}
			else if (a instanceof ee.Array) {
				return func(a, b.toArray());
			}
			else if (a instanceof ee.Number && b instanceof ee.Image) {
				a = ee.Image(a).copyProperties({ source: b, properties: b.propertyNames() });
				return func(a, b);
			}
			else if (a instanceof ee.Number && b instanceof ee.Array) {
				a = ee.Array(ee.List.repeat(a, b.toList().length()));
				return func(a, b);
			}

			throw node.invalidArgument(yParameter, "Combination of unsupported data types.");
		};

		if (x instanceof ee.ImageCollection && y instanceof ee.ImageCollection) {
			throw node.invalidArgument(yParameter, "Can't apply binary function to two image collections.");
		}
		else if (x instanceof ee.ImageCollection && this.isNumType(y)) {
			return x.map(img => eeFunc(img, y));
		}
		else if (this.isNumType(x) && y instanceof ee.ImageCollection) {
			return y.map(img => eeFunc(x, img));
		}
		else if (this.isNumType(x) && this.isNumType(y)) {
			return eeFunc(x, y);
		}
		else {
			const param = this.isNumType(x) ? yParameter : xParameter;
			throw node.invalidArgument(param, "Combination of unsupported data types.");
		}
	},

	applyNumFunction(node, func, dataParameter = "x") {
		const ee = node.ee;
		const data = node.getArgumentAsEE(dataParameter);
		if (this.isNumType(data)) {
			return func(data);
		}
		else if (data instanceof ee.ImageCollection) {
			return data.map(img => func(img));
		}

		throw node.invalidArgument(dataParameter, "Unsupported data type.");
	},

	reduceNumFunction(node, func, dataParameter = "data") {
		const ee = node.ee;
		const data = node.getArgumentAsEE(dataParameter);
		if (this.isNumArrayType(data)) {
			return func(data);
		}
		else if (data instanceof ee.ImageCollection) {
			return data.map(img => func(img));
		}

		throw node.invalidArgument(dataParameter, "Unsupported data type.");
	},

	toList(ee, data, converter = null) {
		if (Array.isArray(data)) {
			if (typeof converter === 'function') {
				data = data.map(converter);
			}
			return ee.List(data);
		}
		else if (data instanceof ee.Array) {
			return data.toList();
		}
		else if (data instanceof ee.List) {
			return data;
		}
		else if (data instanceof ee.Dictionary) {
			return data.values();
		}
		else if (data instanceof ee.ComputedObject) {
			return ee.List(data);
		}

		return null;
	},

	toString(ee, data) {
		if (typeof data === 'boolean' || typeof data === 'number' || typeof data === 'string') {
			return ee.String(String(data));
		}
		else if (data instanceof ee.String) {
			return data;
		}
		else if (data instanceof ee.Date) {
			return data.format().cat("Z");
		}
		else if (data instanceof ee.ComputedObject || data instanceof ee.Number) {
			return ee.String(data);
		}


		return null;
	},

	toNumber(ee, data) {
		if (typeof data === 'number' || data instanceof ee.ComputedObject) {
			return ee.Number(data);
		}
		else if (typeof data === 'boolean') {
			return ee.Number(data ? 1 : 0);
		}
		else if (data instanceof ee.Number) {
			return data;
		}
		else if (data instanceof ee.Date) {
			return data.millis();
		}

		return null;
	},

	tropicalSeasons(node) {
		const ee = node.ee;
		return {
			ndjfma: ee.List([-1, 0, 1, 2, 3, 4]),
			mjjaso: ee.List([5, 6, 7, 8, 9, 10])
		};
	},

	seasons(node) {
		const ee = node.ee;
		return {
			djf: ee.List([0, 1, 2]),
			mam: ee.List([3, 4, 5]),
			jja: ee.List([6, 7, 8]),
			son: ee.List([9, 10, 11])
		};
	},

	geoJsonToGeometry(node, geojson) {
		const ee = node.ee;
		switch(geojson.type) {
			case 'Feature':
				return ee.Geometry(geojson.geometry);
			case 'FeatureCollection': {
				const geometries = {
					type: "GeometryCollection",
					geometries: []
				};
				for(const i in geojson.features) {
					geometries.geometries.push(geojson.features[i].geometry);
				}
				return ee.Geometry(geometries);
			}
			case 'Point':
			case 'MultiPoint':
			case 'LineString':
			case 'MultiLineString':
			case 'Polygon':
			case 'MultiPolygon':
			case 'GeometryCollection':
				return ee.Geometry(geojson);
			default:
				return null;
		}

	},

	geoJsonToFeatureCollection(node, geojson) {
		const ee = node.ee;
		switch(geojson.type) {
			case 'Point':
			case 'MultiPoint':
			case 'LineString':
			case 'MultiLineString':
			case 'Polygon':
			case 'MultiPolygon':
			case 'GeometryCollection':
			case 'Feature':
				return ee.FeatureCollection(ee.Feature(geojson));
			case 'FeatureCollection': {
				const features = [];
				for(const i in geojson.features) {
					features.push(ee.Feature(geojson.features[i]));
				}
				return ee.FeatureCollection(features);
			}
			default:
				return null;
		}
	}

};

export default GeeUtils;
