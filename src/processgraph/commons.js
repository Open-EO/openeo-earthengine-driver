const Errors = require('../errors');
const Utils = require('../utils');

module.exports = class ProcessCommons {

	static reduceInCallback(node, reducer, ...add_args) {
		var dc = node.getData("data");
		var func = data => data.reduce(reducer);  // TODO: How does this exactly work?
		if (node.getProcessGraph().isSimpleReducer() || dc.isImageCollection()) {
			dc.imageCollection(func, ...add_args);
		}
		else if (dc.isArray()) {
			dc.array(func, ...add_args);
		}
		else {
			throw "Calculating " + reducer + " not supported for given data type.";
		}
		return dc;
	}

	static applyInCallback(node, process) {
		var dc = node.getData("data");
		var func = data => data[process];  //TODO: how do I properly translate a string into a function?
		if (dc.isImageCollection()) {
			var mapper = data => data.map(func);
			dc.imageCollection(mapper);
		}
		else if (dc.isArray()) {
			dc.array(func);
		}
		else {
			throw "Calculating " + process + " not supported for given data type.";
		}
		return dc;
	}

	static applyDimensionInCallback(node, process, dimension, ...add_args) {
		var dc = node.getData("data");
		var func = data => data[process];  //TODO: how do I properly translate a string into a function?
		if (dc.isImageCollection()) {
			dc.imageCollection(func, dimension, ...add_args);
		}
		else if (dc.isArray()) {
			dc.array(func, dimension, ...add_args);
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

	static filterBands(dc, bands) {
		dc.imageCollection(ic => ic.select(bands, bands));
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

}
