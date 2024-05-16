import Utils from "../../utils/utils.js";

/*
ComputedObject is returned by the following functions:
- ee.Algorithms.If
- ee.Directory.get
- ee.List.get
- ee.String.decodeJSON
- ee.apply
- ee.*.aside
- ee.*.copyProperties
- ee.*.iterate
- ee.Algorithms.Describe (maybe)
- ee.List.reduce (maybe)
See: https://issuetracker.google.com/issues/325444873
*/

const GeeTypes = {

	jsToEE(node, data) {
		const ee = node.ee;
		if (typeof data === 'boolean') {
			node.warn("Implicit conversion of a boolean value to an integer.");
			return data ? ee.Number(1) : ee.Number(0);
		}
		else if (typeof data === 'number') {
			return ee.Number(data);
		}
		else if (typeof data === 'string') {
			return ee.String(data);
		}
		else if (typeof data === 'object') {
			if (Array.isArray(data)) {
				return ee.List(data);
			}
			else if (Utils.isObject(data)) {
				return ee.Dictionary(data);
			}
		}

		return null;
	},

	getEarthEngineType(ee, obj, returnComputedObject = false) {
		if (!Utils.isObject(obj)) {
			return null;
		}
		if (obj instanceof ee.Array) {
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
		// all other EE classes also inherit from ComputedObject so this must be last
		else if (obj instanceof ee.ComputedObject && returnComputedObject) {
			return "ComputedObject";
		}
		return null;
	},

	isComputedObject(ee, obj) {
		return Utils.isObject(obj) && obj instanceof ee.ComputedObject && !GeeTypes.isEarthEngineType(ee, obj, false);
	},

	isEarthEngineType(ee, obj, includeComputedObject = true) {
		return Utils.isObject(obj) && (
			(includeComputedObject && obj instanceof ee.ComputedObject) ||
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
			obj instanceof ee.Number
			|| obj instanceof ee.Image
			|| obj instanceof ee.Array
		);
	},

	isSameNumType(ee, a, b) {
		return Utils.isObject(a) && Utils.isObject(b) && (
			(a instanceof ee.Number && b instanceof ee.Number)
			|| (a instanceof ee.Image && b instanceof ee.Image)
			|| (a instanceof ee.Array && b instanceof ee.Array)
		);
	},

	toArray(ee, data, converter = null, defaultType = ee.PixelType.double()) {
		if (Array.isArray(data)) {
			if (typeof converter === 'function') {
				data = data.map(converter);
			}
			if (data.length > 0) {
				defaultType = null;
			}
			return ee.Array(data, defaultType);
		}
		else if (data instanceof ee.Array) {
			return data;
		}
		else if (data instanceof ee.List) {
			// see https://issuetracker.google.com/issues/340814270
			// const isEmpty = ee.Number(data.length()).eq(0);
			// const pixelType = ee.Algorithms.If(isEmpty, defaultType);
			// return ee.Array(data, pixelType);
			return ee.Array(data);
		}
		else if (data instanceof ee.Dictionary) {
			return data.toArray();
		}
		else if (GeeTypes.isComputedObject(ee, data)) {
			return ee.Array(data);
		}

		return null;
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
		else if (GeeTypes.isComputedObject(ee, data)) {
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
		else if (data instanceof ee.Number || GeeTypes.isComputedObject(ee, data)) {
			return ee.String(data);
		}

		return null;
	},

	toNumber(ee, data) {
		if (typeof data === 'number' || GeeTypes.isComputedObject(ee, data)) {
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
	}

};

export default GeeTypes;
