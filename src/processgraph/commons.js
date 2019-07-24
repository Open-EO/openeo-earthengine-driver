const Errors = require('../errors');
const Utils = require('../utils');

module.exports = class ProcessCommons {

	static reduceInCallback(node, reducer, dataArg="data", reducerName=null) {
		var isSimpleReducer = node.getProcessGraph().isSimpleReducer();
		var dc = node.getData(dataArg);
		if (reducerName === null){
			reducerName = reducer;
		}
		if (!this.isString(reducerName)){
			throw new Error("The input parameter 'reducerName' is not a string.");
		}
		var func = data => data.reduce(reducer);
		if (isSimpleReducer || dc.isImageCollection()) {
			dc.imageCollection(func);
			// revert renaming of the bands following to the GEE convention
			var bands = dc.getBands();
			var renamedBands = bands.map(bandName => bandName + "_" + reducerName);
			var renameBands = image => image.select(renamedBands).rename(bands);
			dc.imageCollection(data => data.map(renameBands));
		}
		else if (dc.isArray()) {
			dc.array(func);
		}
		else {
			throw new Error("Calculating " + reducer + " not supported for given data type.");
		}
		return dc;
	}

	static applyInCallback(node, imageProcess, arrayProcess, dataArg="x") {
		var dc = node.getData(dataArg);
//		var dimension = node.getParameter("dimension"); // TODO: use it for apply_dimension
		if (dc.isImageCollection()) {
			dc.imageCollection(data => data.map(imageProcess));
		}
		else if (dc.isImage()){
			dc.image(imageProcess);
		}
		else if (dc.isArray()) {
			dc.array(arrayProcess);
		}
		else {
			throw "Calculating " + process + " not supported for given data type.";
		}
		return dc;
	}

	static filterBbox(dc, bbox, process_id, paramName) {
		try {
			dc.setSpatialExtent(bbox);
			var geom = dc.getSpatialExtentAsGeeGeometry();
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

	static filterPolygon(dc, polygons, process_id, paramName) {
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

	//TODO
	/*
	static filter(dc, expression, dimensionName){
		var dimension = dc.findSingleDimension(dimensionName);
		var values = dimension.getValues();
		//var selection = => ;
		//var values_filtered = await expression.execute({x: data});
		dc.findSingleDimension(dimensionName).setValues(values_filtered);

		return dc;
	}*/

	static dimOEO2dimGEE(bandName, parName=null){
		var dimensionString = bandName;
		if (parName !== null){
			dimensionString += "_" + parName
		}

		return dimensionString
	}

	static dimGEE2dimOEO(dimensionString){
		var stringParts = dimensionString.split('_');
		var bandName = (stringParts.length > 0) ? stringParts[0] : null;
		var parName = (stringParts.length > 1) ? stringParts[1] : null;

		return [bandName, parName]
	}

	static isString(x) {
		return typeof(x) === 'string' || x instanceof String;
	}

	static isNumber(x) {
		return typeof(x) === 'string' || x instanceof Number;
	}

	static isBoolean(x) {
		return typeof(x) === 'boolean' || x instanceof Boolean;
	}

};
