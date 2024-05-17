import DataCube from '../../processgraph/datacube.js';
import Errors from '../../utils/errors.js';
import Utils from '../../utils/utils.js';
import GeeGeoJsonUtils from './geojson.js';
import { DateTime, Settings } from 'luxon';

Settings.throwOnInvalid = true;

const GeeFilters = {

	_canFilter(ee, data) {
		return data instanceof ee.ImageCollection || data instanceof ee.Image;
	},

	_viaImageCollection(ee, data, func) {
		const castToImage = (data instanceof ee.Image);
    if (castToImage) {
      data = ee.ImageCollection(data);
    }
		data = func(data);
    if (castToImage) {
      data = data.first();
    }
		return data;
	},

	filterTemporal(node, extentParam, dataParam = "data") {
    const ee = node.ee;
		// Todo: Support GEE type inputs
    let [min, max] = node.getArgument(extentParam);
		try {
			const minDate = DateTime.fromISO(min, {zone: "utc"});
			const maxDate = DateTime.fromISO(max, {zone: "utc"});
			if (minDate > maxDate) {
				throw new Errors.TemporalExtentEmpty();
			}
		} catch (e) {
      throw node.invalidArgument(extentParam, e.message);
		}

		let dc;
		if (dataParam instanceof DataCube) {
			dc = dataParam;
		}
		else {
			dc = node.getDataCubeWithEE(dataParam);
		}
		const dim = dc.dimT();
		if (!dim) {
			throw new Errors.DimensionTypeNotAvailable({
				process: node.process_id,
				type: "temporal"
			});
		}

    let data = dc.getData();
		if (this._canFilter(ee, data)) {
			data = this._viaImageCollection(ee, data, ic => ic.filter(ee.Filter.date(
				min || "0000-01-01",
				max || "9999-12-31"
			)));
			dim.setExtent(min, max);
		}
		else {
			const paramName = typeof dataParam === "string" ? dataParam : extentParam;
			throw node.invalidArgument(paramName, "Given data type can't be filtered by temporal extent.");
		}

    return dc.setData(data);
	},

	filterSpatial(node, extentParam, dataParam = "data") {
    const ee = node.ee;
		// Todo: Support GEE type inputs
    const extent = node.getArgument(extentParam);
		let dc;
		if (dataParam instanceof DataCube) {
			dc = dataParam;
		}
		else {
			dc = node.getDataCubeWithEE(dataParam);
		}
		if (!dc.dimX() || !dc.dimY()) {
			throw new Errors.DimensionTypeNotAvailable({
				process: node.process_id,
				type: "spatial"
			});
		}

		let geometry = null;
		let bbox = null;
		let clip = false;
		if (Utils.isBBox(extent)) { // Bounding box
			geometry = Utils.bboxToGeoJson(extent);
			bbox = extent;
		}
		else if (extent.type) { // GeoJSON - has been validated before so `type` should be a safe indicator for GeoJSON
			geometry = extent;
			bbox = Utils.geoJsonBbox(extent);
			clip = true;
		}
		else {
			throw node.invalidArgument(extentParam, "Unsupported value provided.");
		}

    let data = dc.getData();
		if (this._canFilter(ee, data)) {
			const eeGeometry = GeeGeoJsonUtils.toGeometry(node, geometry);
			data = this._viaImageCollection(ee, data, ic => ic.filter(ee.Filter.bounds(eeGeometry)));
			if (clip) {
				data = this._viaImageCollection(ee, data, ic => ic.map(img => img.clip(eeGeometry)));
			}
			dc.setSpatialExtent(bbox);
		}
		else {
			const paramName = typeof dataParam === "string" ? dataParam : extentParam;
			throw node.invalidArgument(paramName, "Given data type can't be filtered by spatial extent.");
		}

    return dc.setData(data);
	},

	filterBands(node, bandsParam, dataParam = "data") {
    const ee = node.ee;

		let dc;
		if (dataParam instanceof DataCube) {
			dc = dataParam;
		}
		else {
			dc = node.getDataCubeWithEE(dataParam);
		}

		const dim = dc.dimBands();
		if (!dim) {
			throw new Errors.DimensionTypeNotAvailable({
				process: node.process_id,
				type: "bands"
			});
		}

		const availableBands = dc.getBands();
		if (!Array.isArray(availableBands)) {
			throw node.invalidArgument(bandsParam, `Data cube does not contain bands.`);
		}
		// Todo: Support GEE type inputs
    const requestedBands = node.getArgument(bandsParam);
		for(const band of requestedBands) {
			if (!availableBands.includes(band)) {
				throw node.invalidArgument(bandsParam, `Band with name '${band}' not found in data cube.`);
			}
		}

    let data = dc.getData();
		if (this._canFilter(ee, data)) {
			data = this._viaImageCollection(ee, data, ic => ic.select(requestedBands));
			dim.setValues(requestedBands);
		}
		else {
			const paramName = typeof dataParam === "string" ? dataParam : bandsParam;
			throw node.invalidArgument(paramName, "Given data type can't be filtered by bands.");
		}

    return dc.setData(data);
	}

}

export default GeeFilters;
