const Errors = require('../errors');
const Utils = require('../utils');

module.exports = class ProcessCommons {

	static reduceInCallback(node, reducer) {
		var dc = node.getData("data");
		var func = data => data.reduce(reducer);
		if (node.getProcessGraph().isSimpleReducer() || dc.isImageCollection()) {
			dc.imageCollection(func);
		}
		else if (dc.isArray()) {
			dc.array(func);
		}
		else {
			throw "Calculating min not supported for given data type.";
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
