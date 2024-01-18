import { BaseProcess, ProcessGraph } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';
import Errors from '../utils/errors.js';

export default class aggregate_temporal_frequency extends BaseProcess {

	/*async*/ reduce(node, imageCollection) {
		// ToDo processes: Execute reducer, see also #36
		// Use ... await Commons.reduce(...);

		let callback = node.getArgument('reducer');
		if (!(callback instanceof ProcessGraph)) {
			throw new Errors.ProcessArgumentInvalid({
				process: this.id,
				argument: 'reducer',
				reason: 'No reducer specified.'
			});
		}
		else if (callback.getNodeCount() !== 1) {
			throw new Errors.ProcessArgumentInvalid({
				process: this.id,
				argument: 'reducer',
				reason: "No complex reducer supported at the moment"
			});
		}
		else {
			// This is a simple reducer with just one node
			var childNode = callback.getResultNode();
			var process = callback.getProcess(childNode);
			if (typeof process.geeReducer !== 'function') {
				throw new Errors.ProcessArgumentInvalid({
					process: this.id,
					argument: 'reducer',
					reason: 'The specified reducer is invalid.'
				});
			}
			node.debug("Bypassing node " + childNode.id + "; Executing as native GEE reducer instead.");
			var reducerFunc = process.geeReducer(node);
			return imageCollection.reduce(reducerFunc);
		}
	}

	async execute(node) {
		// STEP 1: Get parameters and set some variables
		var dc = node.getDataCube('data');
		var frequency = node.getArgument('frequency');

		// STEP 2: prepare image collection with aggregation label
		var images = Commons.setAggregationLabels(dc.imageCollection(), frequency);

		// STEP 3: aggregate based on aggregation label

		// Get a unique list of all year/season labels
		var newLabels = ee.List(images.aggregate_array('aggregationLabel')).distinct();

		// Aggregation for each year/season label
		var aggregatedImages = newLabels.map(/*async*/ (label) => {
			var collection = images.filterMetadata('aggregationLabel', 'equals', label);
			var firstImg = collection.first();
			var image = /*await*/ this.reduce(node, collection);
			return image.copyProperties({source: firstImg, properties: firstImg.propertyNames()});
		});

		// STEP 4: Update data cube
		dc.setData(ee.ImageCollection(aggregatedImages));

		var dimensionName = node.getArgument('dimension');
		var dimension = dc.dim(dimensionName);
		if (dimension === null) {
			dimension = dc.dimT();
		}
		var dimLabels = newLabels.getInfo(); // ToDo: Make faster, getInfo is slooow.
		dimension.setValues(dimLabels);

		return dc;
	}

}
