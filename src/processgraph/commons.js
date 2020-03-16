const Errors = require('../errors');
const Utils = require('../utils');
const DataCube = require('./datacube');
const ProcessGraph = require('./processgraph');


module.exports = class Commons {

	// ToDo: Also implement ee.Array.* instead only ee.Image.*

	static async reduce(node, dc, process_id, allowedDimensionTypes = ["temporal", "bands"], reducerArgName = "reducer", dimensionArgName = "dimension", contextArgName = "context") {
		var dimensionName = node.getArgument(dimensionArgName);
		var dimension = dc.getDimension(dimensionName);
		if (!allowedDimensionTypes.includes(dimension.type)) {
			throw new Errors.ProcessArgumentInvalid({
				process: process_id,
				argument: dimensionArgName,
				reason: 'Reducing dimension types other than ' + allowedDimensionTypes.join(' or ') + ' is currently not supported.'
			});
		}

		var callback = node.getArgument(reducerArgName);
		if (!(callback instanceof ProcessGraph)) {
			throw new Errors.ProcessArgumentInvalid({
				process: process_id,
				argument: reducerArgName,
				reason: 'No ' + reducerArgName + ' specified.'
			});
		}
		else if (callback.getNodeCount() === 1) {
			// This is a simple reducer with just one node
			var childNode = callback.getResultNode();
			var process = callback.getProcess(childNode);
			if (typeof process.geeReducer !== 'function') {
				throw new Errors.ProcessArgumentInvalid({
					process: process_id,
					argument: reducerArgName,
					reason: 'The specified ' + reducerArgName + ' is invalid.'
				});
			}
			console.log("Bypassing node " + childNode.id + "; Executing as native GEE reducer instead.");
			dc = Commons.reduceSimple(dc, process.geeReducer(node));
		}
		else {
			// This is a complex reducer
			var values;
			var ic = dc.imageCollection();
			if (dimension.type === 'temporal') {
				values = ic.toList(ic.size());
			}
			else if (dimension.type === 'bands') {
				values = dimension.getValues().map(band => ic.select(band));
			}
			var resultNode = await callback.execute({
				data: values,
				context: node.getArgument(contextArgName)
			});
			dc.setData(resultNode.getResult());

			// If we are reducing over bands we need to set the band name in GEE to a default one, e.g., "#"
			if (dimension.type === 'bands') {
				dc.imageCollection(data => data.map(
					img => img.select(dc.imageCollection().first().bandNames()).rename(["#"])
				));
			}
		}
		return dc;
	}

	static reduceSimple(dc, reducerFunc, reducerName = null) {
		if (reducerName === null) {
			if (typeof reducerFunc === 'string') {
				reducerName = reducerFunc;
			}
			else {
				throw new Error("The parameter 'reducerName' must be specified.");
			}
		}

		if (!dc.isImageCollection() && !dc.isImage()) {
			throw new Error("Calculating " + reducerName + " not supported for given data type: " + dc.objectType());
		}
	
		dc.imageCollection(data => data.reduce(reducerFunc));

		// revert renaming of the bands following to the GEE convention
		var bandNames = dc.getEarthEngineBands();
		if (bandNames.length > 0) {
			// Map GEE band names to openEO band names
			var rename = {};
			for(let bandName of bandNames) {
				let geeBandName = bandName + "_" + reducerName;
				rename[geeBandName] = bandName;
			}
			
			dc.imageCollection(data => data.map(
				img => {
					// Create a GEE list with expected band names
					var geeBands = img.bandNames();
					for(var geeBandName in rename) {
						geeBands = geeBands.replace(geeBandName, rename[geeBandName]);
					}
			
					// Rename bands
					return img.rename(geeBands);
				}
			));
		}

		return dc;
	}

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

	static restrictToSpatialExtent(dc) {
		var bbox = dc.getSpatialExtent();
		var geom = ee.Geometry.Rectangle([bbox.west, bbox.south, bbox.east, bbox.north], bbox.crs || 'EPSG:4326');
		dc.imageCollection(ic => ic.filterBounds(geom));
		return dc;
	}

	static filterBbox(dc, bbox, process_id, paramName) {
		try {
			dc.setSpatialExtent(bbox);
			return Commons.restrictToSpatialExtent(dc);
		} catch (e) {
			throw new Errors.ProcessArgumentInvalid({
				process: process_id,
				argument: paramName,
				reason: e.message
			});
		}
	}

	static filterBands(dc, bands) {
		dc.imageCollection(ic => ic.select(bands));
		dc.dimBands().setValues(bands);
		return dc;
	}

	static filterGeoJSON(dc, geometries, process_id, paramName) {
		try {
			var geom = Utils.geoJsonToGeometry(geometries);
			dc.setSpatialExtentFromGeometry(geometries);
			dc = Commons.restrictToSpatialExtent(dc);
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

	static setAggregationLabels(images, frequency) {
		var aggregationFormat = null;
		var temporalFormat = null;
		var seasons = {};
		switch (frequency) {
			case 'hourly':
				aggregationFormat = "yyyy-MM-DD-HH";
				temporalFormat = "HH";
				break;
			case 'daily':
				aggregationFormat = "yyyy-DDD";
				temporalFormat = "DDD";
				break;
			case 'weekly':
				aggregationFormat = "yyyy-ww";
				temporalFormat = "ww";
				break;
			case 'monthly':
				aggregationFormat = "yyyy-MM";
				temporalFormat = "MM";
				break;
			case 'yearly':
				aggregationFormat = "yyyy";
				temporalFormat = "yyyy";
				break;
			case 'seasons':
				seasons = Utils.seasons();
				break;
			case 'tropical_seasons':
				seasons = Utils.tropicalSeasons();
				break;
		}

		// prepare image collection with aggregation labels
		var images = images.sort('system:time_start');
		switch (frequency) {
			case 'hourly':
			case 'daily':
			case 'weekly':
			case 'monthly':
			case 'yearly':
				return images.map(img => {
					var date = img.date();
					return img.set('aggregationLabel', date.format(aggregationFormat)).set("label", date.format(temporalFormat));
				});
			case 'seasons':
			case 'tropical_seasons':
				// This is are lists with relative months, e.g. 0 is december of the prev. year, -1 is november etc.
				seasons = ee.Dictionary(seasons);
				// Convert the relative months like -1 to their absolute values like 11.
				var realSeasons = seasons.map(label, months => {
					return ee.List(months).map(m => {
						var num = ee.Number(m);
						return ee.Algorithms.If(num.lt(1), num.add(12), num);
					});
				});

				// Prepare image collection to contain aggregation label
				return images.map(img => {
					var date = img.date();
					var month = date.get('month');
					// Compute the corresponding season for the date
					var remainingSeason = seasons.map((label, months) => {
						var monthsInSeason = ee.List(realSeasons.get(label));
						return ee.Algorithms.If(monthsInSeason.contains(month), months, null); // null removes the element from the list
					});
					// Get the season - there should only be one entry left
					var season = remainingSeason.keys().get(0);
					var months = ee.List(remainingSeason.values().get(0));
					// Construct the "season label"
					var year = date.get('year');
					year = ee.Algorithms.If(months.contains(month), year, ee.Number(year).add(1));
					var index = ee.String(year).cat('-').cat(season); // e.g. 1979-son
					return img.set('aggregationLabel', index).set("label", season);
				});
		}
	}

};
