const Errors = require('../errors');
const Utils = require('../utils');
const DataCube = require('./datacube');

module.exports = class ProcessCommons {

	// ToDo: Also implement ee.Array.* instead only ee.Image.*

	static reduceBinaryInCallback(node, imgReducer, jsReducer, arg1Name = "x", arg2Name = "y") {
		var arg1 = node.getArgument(arg1Name);
		var arg2 = node.getArgument(arg2Name);
		if (typeof arg1 === 'undefined') {
			throw new Errors.ProcessArgumentInvalid({
				process: node.process_id,
				argument: arg1Name,
				reason: "Argument is undefined."
			});
		}
		if (typeof arg2 === 'undefined') {
			throw new Errors.ProcessArgumentInvalid({
				process: node.process_id,
				argument: arg2Name,
				reason: "Argument is undefined."
			});
		}

		return this._reduceBinary(node, imgReducer, jsReducer, arg1, arg2);
	}

	static reduceInCallback(node, imgReducer, jsReducer, dataArg = "data") {
		var list = node.getArgument(dataArg);
		if (!Array.isArray(list) || list.length <= 1) {
			throw new Errors.ProcessArgumentInvalid({
				process: node.process_id,
				argument: dataArg,
				reason: "Not enough elements."
			});
		}

		var result;
		for(var i = 1; i < list.length; i++) {
			result = this._reduceBinary(node, imgReducer, jsReducer, list[i-1], list[i]);
		}
		return result;
	}

	static _reduceBinary(node, imgReducer, jsReducer, valA, valB) {
		let result;
		var dataCubeA = new DataCube(null, valA);
		var dataCubeB = new DataCube(null, valB);
		if (typeof valA === 'undefined' && typeof valB === 'undefined') {
			// Should be caught by reduce(Binary)InCallback already...
			throw new Errors.UndefinedElements({
				process: node.process_id
			});
		}
		else if (typeof valA === 'undefined') {
			return valB;
		}
		else if (typeof valB === 'undefined') {
			return valA;
		}
		else if (typeof valA === 'number') {
			var imgA = ee.Image(valA);
			if (typeof valB === 'number') {
				result = jsReducer(valA, valB);
			}
			else if (dataCubeB.isImage()) {
				result = imgReducer(imgA, dataCubeB.image());
			}
			else if (dataCubeB.isImageCollection()) {
				result = dataCubeB.imageCollection(ic => ic.map(imgB => imgReducer(imgA, imgB)));
			}
			else {
				throw new Errors.ProcessArgumentInvalid({
					process: node.process_id,
					argument: dataArg,
					reason: "Reducing number with unknown type not supported (index: "+i+")"
				});
			}
		}
		else if (dataCubeA.isImageCollection()) {
			if (typeof valB === 'number' || dataCubeB.isImage()) {
				var imgB = typeof valB === 'number' ? ee.Image(valB) : dataCubeB.image();
				result = dataCubeA.imageCollection().map(imgA => imgReducer(imgA, imgB));
			}
			else if (dataCubeB.isImageCollection()) {
				var collA = dataCubeA.imageCollection();
				var collB = dataCubeB.imageCollection();
				var listA = collA.toList(collA.size());
				var listB = collB.toList(collB.size());
				result = collA.map(imgA => {
					var index = listA.indexOf(imgA);
					var imgB = listB.get(index);
					return imgReducer(imgA, imgB);
				});
			}
			else {
				throw new Errors.ProcessArgumentInvalid({
					process: node.process_id,
					argument: dataArg,
					reason: "Reducing image collection with unknown type not supported (index: "+i+")"
				});
			}
		}
		else if (dataCubeA.isImage()) {
			if (typeof valB === 'number' || dataCubeB.isImage()) {
				var imgB = typeof valB === 'number' ? ee.Image(valB) : dataCubeB.image();
				result = imgReducer(dataCubeA.image(), imgB);
			}
			else if (dataCubeB.isImageCollection()) {
				result = dataCubeB.imageCollection(ic => ic.map(imgB => imgReducer(dataCubeA.image(), imgB)));
			}
			else {
				throw new Errors.ProcessArgumentInvalid({
					process: node.process_id,
					argument: dataArg,
					reason: "Reducing image with unknown type not supported (index: "+i+")"
				});
			}
		}
		else {
			throw new Errors.ProcessArgumentInvalid({
				process: node.process_id,
				argument: dataArg,
				reason: "Reducing an unknown type is not supported (index: "+i+")"
			});
		}
		return result;
	}

	static applyInCallback(node, imageProcess, jsProcess = null, dataArg = "x") {
		var data = node.getArgument(dataArg);
		var dc = new DataCube(null, data);
		if (dc.isNull()) {
			return null;
		}
		else if (dc.isNumber() && typeof jsProcess === 'function') {
			return jsProcess(data);
		}
		else if (dc.isImage()) {
			return dc.image(imageProcess);
		}
		else if (dc.isImageCollection()) {
			return dc.imageCollection(data => data.map(imageProcess));
		}
		else {
			throw new Error("Applying " + node.process_id + " not supported for given data type: " + dc.objectType());
		}
	}

	static filterBbox(dc, bbox, process_id, paramName) {
		try {
			dc.setSpatialExtent(bbox);
			var geom = ee.Geometry.Rectangle([bbox.west, bbox.south, bbox.east, bbox.north], bbox.crs || 'EPSG:4326');
			dc.imageCollection(ic => ic.filterBounds(geom));
			return dc;
		} catch (e) {
			throw new Errors.ProcessArgumentInvalid({
				process: process_id,
				argument: paramName,
				reason: e.message
			});
		}
	}

	// TODO: this changes the dc directly, copy would be more suitable if it does not cost too much
	static filterBands(dc, bands) {
		dc.imageCollection(ic => ic.select(bands));
		dc.dimBands().setValues(bands);
		return dc;
	}

	static filterPolygons(dc, polygons, process_id, paramName) {
		try {
			var geom = Utils.geoJsonToGeometry(polygons);
			dc.setSpatialExtentFromGeometry(polygons);
			dc.imageCollection(ic => ic.map(img => img.clip(geom)));
			return dc;
		} catch (e) {
			throw new Errors.ProcessArgumentInvalid({
				process: process_id,
				argument: paramName,
				reason: e.message
			});
		}
	}

	static filterTemporal(dc, extent, process_id, paramName, dimension = null) {
		// ToDo: There's not really support for multiple temporal dimensions in GEE?!
		// Data for all dimensions is restricted on Googles side, but we set the extent in the virtual data cube accordingly.
		dc.imageCollection(ic => ic.filterDate(
			extent[0] === null ? '0000-01-01' : extent[0], // If Open date range: We just set the extent to the minimal start date here.
			extent[1] === null ? Date.now() : extent[1]  // If Open date range: The end date is set to the current date
		));
		var dim = null;
		if (dimension !== null) {
			dim = dc.dim(dimension);
		}
		else {
			dim = dc.dimT();
		}
		if (dim) {
			dim.setExtent(extent);
		}
		else {
			throw new Errors.DimensionNotAvailable({
				process: process_id,
				argument: paramName
			});
		}
		return dc;
	}

};
