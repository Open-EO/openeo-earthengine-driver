import { BaseProcess } from '@openeo/js-processgraphs';
import DataCube from '../processgraph/datacube.js';
import Commons from '../processgraph/commons.js';

export default class load_collection extends BaseProcess {

	async execute(node) {
		const ee = node.ee;
		// Load data
		const id = node.getArgument('id');
		const collection = node.getContext().getCollection(id);
		let dc = new DataCube(ee);
		dc.setLogger(node.getLogger());
		let eeData;
		if (collection['gee:type'] === 'image') {
			eeData = ee.Image(id);
		}
		else {
			eeData = ee.ImageCollection(id);
		}
		dc.setData(eeData);
		dc.setCollectionId(id);
		dc.setDimensionsFromSTAC(collection['cube:dimensions']);

		// Filter temporal
		const temporal_extent = node.getArgument("temporal_extent");
		if (temporal_extent !== null) {
			dc = Commons.filterTemporal(dc, temporal_extent);

		}

		// Filter spatial / bbox
		const spatial_extent = node.getArgument("spatial_extent");
		if (spatial_extent !== null) {
			if (spatial_extent.type) { // GeoJSON - has been validated before so `type` should be a safe indicator for GeoJSON
				dc = Commons.filterGeoJSON(node, dc, spatial_extent, this.id, 'spatial_extent');
			}
			else { // Bounding box
				dc = Commons.filterBbox(node, dc, spatial_extent, this.id, 'spatial_extent');
			}
		}

		// Filter bands
		const bands = node.getArgument('bands');
		if (Array.isArray(bands)) {
			dc = Commons.filterBands(dc, bands, node);
		}

		return dc;
	}

}
