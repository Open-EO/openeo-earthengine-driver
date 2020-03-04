const Errors = require('../errors');
const Utils = require('../utils');
const DataCube = require('./datacube');

module.exports = class ProcessCommons {

	static reduceBinaryInCallback(node, jsReducer, imgReducer, arg1Name = "x", arg2Name = "y") {
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

		return this._reduceBinary(node, jsReducer, imgReducer, arg1, arg2);
	}

	static reduceInCallback(node, jsReducer, imgReducer, dataArg = "data") {
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
			result = this._reduceBinary(node, jsReducer, imgReducer, list[i-1], list[i]);
		}
		return result;
	}

	static _reduceBinary(node, jsReducer, imgReducer, valA, valB) {
		let result;
		var dataCubeA = new DataCube(null, valA);
		var dataCubeB = new DataCube(null, valB);
		if (typeof valA === 'number') {
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
			var collA = dataCubeA.imageCollection();
			if (typeof valB === 'number' || dataCubeB.isImage()) {
				var imgB = typeof valB === 'number' ? ee.Image(valB) : dataCubeB.image();
				result = collA.map(imgA => imgReducer(imgA, imgB));
			}
			else if (dataCubeB.isImageCollection()) {
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
			var imgA = dataCubeA.image();
			if (typeof valB === 'number' || dataCubeB.isImage()) {
				var imgB = typeof valB === 'number' ? ee.Image(valB) : dataCubeB.image();
				result = imgReducer(imgA, imgB);
			}
			else if (dataCubeB.isImageCollection()) {
				result = dataCubeB.imageCollection(ic => ic.map(imgB => imgReducer(imgA, imgB)));
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
		var dc = node.getData(dataArg);
		var data = dc.getData();
		if (typeof data === 'number' && typeof jsProcess === 'function') {
			dc.setData(jsProcess(data));
		}
		if (dc.isImageCollection()) {
			dc.imageCollection(data => data.map(imageProcess));
		}
		else if (dc.isImage()){
			dc.image(imageProcess);
		}
		else {
			throw new Error("Calculating " + node.process_id + " not supported for given data type.");
		}
		return dc;
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

	static filterTemporal(dc, extent) {
		dc.imageCollection(ic => ic.filterDate(
			extent[0] === null ? '0000-01-01' : extent[0], // If Open date range: We just set the extent to the minimal start date here.
			extent[1] === null ? Date.now() : extent[1]  // If Open date range: The end date is set to the current date
		));
		dc.dimT().setExtent(extent);
		return dc;
	}

};
