const Process = require('../processgraph/process');
const DataCube = require('../processgraph/datacube');
const Commons = require('../processgraph/commons');

module.exports = class load_collection extends Process {

	async execute(node, context) {
		// Load data
		var id = node.getArgument('id');
		var collection = context.getCollection(id);
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
			if (spatial_extent.type) { // GeoJSON
				dc = Commons.filterPolygons(dc, spatial_extent, this.schema.id, 'spatial_extent');
			}
			else { // Bounding box
				dc = Commons.filterBbox(dc, spatial_extent, this.schema.id, 'spatial_extent');
			}
		}

		// Filter bands
		var bands = node.getArgument('bands');
		if (Array.isArray(bands)) {
			dc = Commons.filterBands(dc, bands);
		}

		return dc;
	}

};