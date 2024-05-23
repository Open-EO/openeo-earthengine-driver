import GeeProcess from '../processgraph/process.js';
import DataCube from '../datacube/datacube.js';
import GeeFilters from './utils/filters.js';

export default class load_collection extends GeeProcess {

	executeSync(node) {
		const ee = node.ee;

		const id = node.getArgument("id");
		const collection = node.getContext().getCollection(id);

		let eeData;
		if (collection["gee:type"] === "image") {
			eeData = ee.Image(id);
		}
		else {
			eeData = ee.ImageCollection(id);
		}

		let dc = new DataCube(ee, eeData);
		dc.setDimensionsFromSTAC(collection["cube:dimensions"]);

		// Filter temporal
		const temporal_extent = node.getArgument("temporal_extent");
		if (temporal_extent !== null) {
			dc = GeeFilters.filterTemporal(node, "temporal_extent", dc);
		}

		// Filter spatial / bbox
		const spatial_extent = node.getArgument("spatial_extent");
		if (spatial_extent !== null) {
			dc = GeeFilters.filterSpatial(node, "spatial_extent", dc);
		}

		// Filter bands
		const bands = node.getArgument("bands");
		if (Array.isArray(bands)) {
			dc = GeeFilters.filterBands(node, "bands", dc);
		}

		// Todo: Support property filter

		return dc;
	}

}
