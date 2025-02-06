import GeeProcess from '../processgraph/process.js';
import GeeClimateUtils from './utils/climate.js';
import GeeProcessing from './utils/processing.js';

export default class aggregate_temporal_period extends GeeProcess {

	async execute(node) {
		const ee = node.ee;
		// STEP 1: Get parameters and set some variables
		const dc = node.getDataCubeWithEE('data');
		const period = node.getArgument('period');
		const reducer = node.getCallback('reducer');
		const dimensionName = node.getArgument('dimension', null);
		const context = node.getArgument("context", null);

		const data = dc.getData();
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

		const temporalLabels = await GeeProcessing.evaluate(newLabels);
		dimension.setValues(temporalLabels);

		return dc;
	}

}
