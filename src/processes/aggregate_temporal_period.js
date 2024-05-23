import GeeProcess from '../processgraph/process.js';
import GeeClimateUtils from './utils/climate.js';

export default class aggregate_temporal_period extends GeeProcess {

	executeSync(node) {
		const ee = node.ee;
		// STEP 1: Get parameters and set some variables
		const dc = node.getDataCubeWithEE('data');
		const period = node.getArgument('period');
		const reducer = node.getCallback('reducer');
		const dimensionName = node.getArgument('dimension', null);
		const context = node.getArgument("context", null);

		const data = node.getData();
		if (!(data instanceof ee.ImageCollection)) {
			throw node.invalidArgument('data', 'Data must have a temporal dimension and/or more than one timestamp.');
		}

		const dimension = dimensionName ? dc.dim(dimensionName) : dc.dimT();
		if (dimension.getType() !== 'temporal') {
			throw node.invalidArgument('dimension', 'The specified dimension must be a temporal dimension.');
		}

		// STEP 2: prepare image collection with aggregation label
		const images = GeeClimateUtils.setAggregationLabels(node, data, period);

		// STEP 3: aggregate based on aggregation label

		// Get a unique list of all year/season labels
		const newLabels = ee.List(images.aggregate_array('aggregationLabel')).distinct();

		// Aggregation for each year/season label
		const aggregatedImages = newLabels.map(label => {
			const collection = images.filterMetadata('aggregationLabel', 'equals', label);
			const firstImg = collection.first();
			const resultNode = ee.Image(reducer.executeSync({
				data: collection,
				context,
				executionContext: {
					type: "reducer",
					parameter: "dimension",
					dimension
				}
			}));
			return ee.Image(resultNode.getResult())
				.set('label', label)
				.set('system:time_start', firstImg.get('system:time_start'));
		});

		// STEP 4: Update data cube
		dc.setData(ee.ImageCollection(aggregatedImages));

		node.warn('Inspecting GEE objects (for dimension labels) via getInfo() is slow. Do not use this in production.');
		dimension.setValues(newLabels.getInfo()); // ToDo: Make faster, getInfo is slow.

		return dc;
	}

}
