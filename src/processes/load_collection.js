const { BaseProcess } = require('@openeo/js-processgraphs');
const DataCube = require('../processgraph/datacube');
const Commons = require('../processgraph/commons');

module.exports = class load_collection extends BaseProcess {

	async execute(node) {
		// Load data
		var id = node.getArgument('id');
		var collection = node.getContext().getCollection(id);
		var dc = new DataCube();
		var images = ee.ImageCollection(id);
		dc.setData(images);
		dc.setDimensionsFromSTAC(collection.properties['cube:dimensions']);

		// Filter temporal
		var temporal_extent = node.getArgument("temporal_extent");
		if (temporal_extent !== null) {
			dc = Commons.filterTemporal(dc, temporal_extent);
		}

		// Filter bbox
		var spatial_extent = node.getArgument("spatial_extent");
		if (spatial_extent !== null) {
// ToDo: Add GeoJSON support again
//			if (spatial_extent.type) { // GeoJSON
//				dc = Commons.filterPolygons(dc, spatial_extent, this.spec.id, 'spatial_extent');
//			}
//			else { // Bounding box
				dc = Commons.filterBbox(dc, spatial_extent, this.spec.id, 'spatial_extent');
//			}
		}

		// Filter bands
		var bands = node.getArgument('bands');
		if (Array.isArray(bands)) {
			dc = Commons.filterBands(dc, bands);
		}

		return dc;
	}

};