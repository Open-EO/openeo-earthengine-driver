import Errors from '../utils/errors.js';
import Utils from '../utils/utils.js';
import DataCube from './datacube.js';
import GeeUtils from '../processgraph/utils.js';


export default class Commons {

	// ToDo processes: Also implement ee.Array.* instead only ee.Image.* #35

	static reduce(node, dc, process_id, allowedDimensionTypes = ["temporal", "bands"], reducerArgName = "reducer", dimensionArgName = "dimension", contextArgName = "context") {
		const dimensionName = node.getArgument(dimensionArgName);
		const dimension = dc.getDimension(dimensionName);
		if (!allowedDimensionTypes.includes(dimension.type)) {
			throw node.invalidArgument(dimensionArgName, `Reducing dimension types other than ${allowedDimensionTypes.join(' or ')} is currently not supported.`);
		}

		const callback = node.getCallback(reducerArgName);
		if (callback.getNodeCount() === 1) {
			// This is a simple reducer with just one node
			const childNode = callback.getResultNode();
			const process = callback.getProcess(childNode);
			if (typeof process.geeReducer !== 'function') {
				throw node.invalidArgument(reducerArgName, 'The specified reducer is invalid.');
			}
			node.debug("Bypassing node " + childNode.id + "; Executing as native GEE reducer instead.");
			dc = Commons.reduceSimple(dc, process.geeReducer(node));
		}
		else {
			// This is a complex reducer
			let values;
			const ic = dc.imageCollection();
			if (dimension.type === 'temporal') {
				values = ic.toList(ic.size());
			}
			else if (dimension.type === 'bands') {
				values = dimension.getValues().map(band => ic.select(band));
			}
			callback.setArguments({
				data: values,
				context: node.getArgument(contextArgName)
			});
			const resultNode = callback.executeSync();
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
		const bandNames = dc.getEarthEngineBands();
		if (bandNames.length > 0) {
			// Map GEE band names to openEO band names
			const rename = {};
			for(const bandName of bandNames) {
				const geeBandName = bandName + "_" + reducerName;
				rename[geeBandName] = bandName;
			}

			dc.imageCollection(data => data.map(
				img => {
					// Create a GEE list with expected band names
					let geeBands = img.bandNames();
					for(const geeBandName in rename) {
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
		const arg1 = node.getArgument(arg1Name);
		const arg2 = node.getArgument(arg2Name);
		if (typeof arg1 === 'undefined') {
			throw node.argumentInvalid(arg1Name, "Argument is undefined.");
		}
		if (typeof arg2 === 'undefined') {
			throw node.argumentInvalid(arg2Name, "Argument is undefined.");
		}

		return this._reduceBinary(node, imgReducer, jsReducer, arg1, arg2, arg1Name + "/" + arg2Name);
	}

	static reduceInCallback(node, imgReducer, jsReducer, dataArg = "data") {
		const list = node.getArgument(dataArg);
		if (!Array.isArray(list) || list.length <= 1) {
			throw node.invalidArgument(dataArg, "Argument must be an array with at least two elements.");
		}

		let result;
		for(let i = 1; i < list.length; i++) {
			result = this._reduceBinary(node, imgReducer, jsReducer, list[i-1], list[i], dataArg);
		}
		return result;
	}

	static _reduceBinary(node, eeImgReducer, jsReducer, valA, valB, dataArg = "data") {
		const ee = node.ee;
		let result;

		const dataCubeA = new DataCube(node.ee, null, valA);
		dataCubeA.setLogger(node.getLogger());

		const dataCubeB = new DataCube(node.ee, null, valB);
		dataCubeA.setLogger(node.getLogger());

		const imgReducer = (a,b) => eeImgReducer(a,b).copyProperties({source: a, properties: a.propertyNames()});

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
			const imgA = ee.Image(valA);
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
				throw node.invalidArgument(dataArg, "Reducing number with unknown type not supported");
			}
		}
		else if (dataCubeA.isImageCollection()) {
			if (typeof valB === 'number' || dataCubeB.isImage()) {
				const imgB = typeof valB === 'number' ? ee.Image(valB) : dataCubeB.image();
				result = dataCubeA.imageCollection().map(imgA => imgReducer(imgA, imgB));
			}
			else if (dataCubeB.isImageCollection()) {
				const collA = dataCubeA.imageCollection();
				const collB = dataCubeB.imageCollection();
				const listA = collA.toList(collA.size());
				const listB = collB.toList(collB.size());
				result = collA.map(imgA => {
					const index = listA.indexOf(imgA);
					const imgB = listB.get(index);
					return imgReducer(imgA, imgB);
				});
			}
			else {
				throw node.invalidArgument(dataArg, "Reducing image collection with unknown type not supported");
			}
		}
		else if (dataCubeA.isImage()) {
			if (typeof valB === 'number' || dataCubeB.isImage()) {
				const imgB = typeof valB === 'number' ? ee.Image(valB) : dataCubeB.image();
				result = imgReducer(dataCubeA.image(), imgB);
			}
			else if (dataCubeB.isImageCollection()) {
				result = dataCubeB.imageCollection(ic => ic.map(imgB => imgReducer(dataCubeA.image(), imgB)));
			}
			else {
				throw node.invalidArgument(dataArg, "Reducing image with unknown type not supported");
			}
		}
		else {
			throw node.invalidArgument(dataArg, "Reducing unknown type not supported");
		}
		return result;
	}

	static applyInCallback(node, eeImgProcess, jsProcess = null, dataArg = "x") {
		const data = node.getArgument(dataArg);
		const dc = new DataCube(node.ee, null, data);
		dc.setLogger(node.getLogger());
		const imgProcess = a => eeImgProcess(a).copyProperties({source: a, properties: a.propertyNames()});
		if (dc.isNull()) {
			return null;
		}
		else if (dc.isNumber() && typeof jsProcess === 'function') {
			return jsProcess(data);
		}
		else if (dc.isImage()) {
			return dc.image(imgProcess);
		}
		else if (dc.isImageCollection()) {
			return dc.imageCollection(img => img.map(imgProcess));
		}
		else {
			throw new Error("Applying " + node.process_id + " not supported for given data type: " + dc.objectType());
		}
	}

	static restrictToSpatialExtent(node, dc) {
		const bbox = dc.getSpatialExtent();
		const geom = node.ee.Geometry.Rectangle([bbox.west, bbox.south, bbox.east, bbox.north], Utils.crsToString(bbox.crs, 4326));
		dc.imageCollection(ic => ic.filterBounds(geom));
		return dc;
	}

	static filterBbox(node, dc, bbox, process_id, paramName) {
		try {
			dc.setSpatialExtent(bbox);
			return Commons.restrictToSpatialExtent(node, dc);
		} catch (e) {
			throw node.invalidArgument(paramName, e.message);
		}
	}

	static filterBands(dc, bands, node, parameterName = 'bands') {
		const dc_bands = dc.getBands();
		const col_id = dc.getCollectionId();
		const col_meta = node.getContext().getCollection(col_id);
		const eo_bands = Array.isArray(col_meta.summaries["eo:bands"]) ? col_meta.summaries["eo:bands"] : [];

		const band_list = [];
		for(const name of bands) {
			if (dc_bands.indexOf(name) > -1) {
				band_list.push(name);
				continue;
			}

			const match = eo_bands.find(eob => name === eob.common_name && typeof eob.name === 'string');
			if (match) {
				band_list.push(match.name);
				continue;
			}

			throw node.invalidArgument(parameterName, `Band with name or common name '${name}' not found in data cube.`);
		}
		dc.imageCollection(ic => ic.select(band_list));
		dc.dimBands().setValues(band_list);
		return dc;
	}

	static filterGeoJSON(node, dc, geometries, process_id, paramName) {
		try {
			const geom = GeeUtils.geoJsonToGeometry(node, geometries);
			dc.setSpatialExtentFromGeometry(geometries);
			dc = Commons.restrictToSpatialExtent(node, dc);
			dc.imageCollection(ic => ic.map(img => img.clip(geom)));
			return dc;
		} catch (e) {
			throw node.invalidArgument(paramName, e.message);
		}
	}

	static filterTemporal(dc, extent, process_id, paramName, dimension = null) {
		// ToDo processes: There's not really support for multiple temporal dimensions in GEE?!
		// Data for all dimensions is restricted on Googles side, but we set the extent in the virtual data cube accordingly.
		dc.imageCollection(ic => ic.filterDate(
			extent[0] === null ? '0000-01-01' : extent[0], // If Open date range: We just set the extent to the minimal start date here.
			extent[1] === null ? Date.now() : extent[1] // If Open date range: The end date is set to the current date
		));
		let dim = null;
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

	static setAggregationLabels(node, images, frequency) {
		const ee = node.ee;
		let aggregationFormat = null;
		let temporalFormat = null;
		let seasons = {};
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
				seasons = GeeUtils.seasons(node);
				break;
			case 'tropical_seasons':
				seasons = GeeUtils.tropicalSeasons(node);
				break;
		}

		// prepare image collection with aggregation labels
		images = images.sort('system:time_start');
		switch (frequency) {
			case 'hourly':
			case 'daily':
			case 'weekly':
			case 'monthly':
			case 'yearly':
				return images.map(img => {
					const date = img.date();
					return img.set('aggregationLabel', date.format(aggregationFormat)).set("label", date.format(temporalFormat));
				});
			case 'seasons':
			case 'tropical_seasons': {
				// This is are lists with relative months, e.g. 0 is december of the prev. year, -1 is november etc.
				seasons = ee.Dictionary(seasons);
				// Convert the relative months like -1 to their absolute values like 11.
				const realSeasons = seasons.map((label, months) => {
					return ee.List(months).map(m => {
						const num = ee.Number(m);
						return ee.Algorithms.If(num.lt(1), num.add(12), num);
					});
				});

				// Prepare image collection to contain aggregation label
				return images.map(img => {
					const date = img.date();
					const month = date.get('month');
					// Compute the corresponding season for the date
					const remainingSeason = seasons.map((label, months) => {
						const monthsInSeason = ee.List(realSeasons.get(label));
						return ee.Algorithms.If(monthsInSeason.contains(month), months, null); // null removes the element from the list
					});
					// Get the season - there should only be one entry left
					const season = remainingSeason.keys().get(0);
					const months = ee.List(remainingSeason.values().get(0));
					// Construct the "season label"
					let year = date.get('year');
					year = ee.Algorithms.If(months.contains(month), year, ee.Number(year).add(1));
					const index = ee.String(year).cat('-').cat(season); // e.g. 1979-son
					return img.set('aggregationLabel', index).set("label", season);
				});
			}
		}
	}

}
