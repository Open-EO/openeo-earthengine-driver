import { BaseProcess } from '@openeo/js-processgraphs';
import DataCube from '../processgraph/datacube.js';
import Commons from '../processgraph/commons.js';

export default class load_collection extends BaseProcess {

	async execute(node) {
		// Load data
		var id = node.getArgument('id');
		var collection = node.getContext().getCollection(id);
		var dc = new DataCube();
		dc.setLogger(node.getLogger());
		let eeData;
		if (collection['gee:type'] === 'image') {
			eeData = ee.ImageCollection(ee.Image(id));
		}
		else {
			eeData = ee.ImageCollection(id);
		}
		dc.setData(eeData);
		dc.setCollectionId(id);
		dc.setDimensionsFromSTAC(collection['cube:dimensions']);

		// Filter temporal
		var temporal_extent = node.getArgument("temporal_extent");
		if (temporal_extent !== null) {
			dc = Commons.filterTemporal(dc, temporal_extent);

		}

		// Filter spatial / bbox
		var spatial_extent = node.getArgument("spatial_extent");
		if (spatial_extent !== null) {
			if (spatial_extent.type) { // GeoJSON - has been validated before so `type` should be a safe indicator for GeoJSON
				dc = Commons.filterGeoJSON(dc, spatial_extent, this.id, 'spatial_extent');
			}
			else { // Bounding box
				dc = Commons.filterBbox(dc, spatial_extent, this.id, 'spatial_extent');
			}
		}

		// Filter bands
		var bands = node.getArgument('bands');
		if (Array.isArray(bands)) {
			dc = Commons.filterBands(dc, bands, node);
		}

		return dc;
	}

}
