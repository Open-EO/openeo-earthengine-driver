import { BaseProcess, ProcessGraph } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';
import Errors from '../utils/errors.js';

export default class aggregate_temporal_frequency extends BaseProcess {

	/*async*/ reduce(node, imageCollection) {
		// ToDo processes: Execute reducer, see also #36
		// Use ... await Commons.reduce(...);

		const callback = node.getArgument('reducer');
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
			const childNode = callback.getResultNode();
			const process = callback.getProcess(childNode);
			if (typeof process.geeReducer !== 'function') {
				throw new Errors.ProcessArgumentInvalid({
					process: this.id,
					argument: 'reducer',
					reason: 'The specified reducer is invalid.'
				});
			}
			node.debug("Bypassing node " + childNode.id + "; Executing as native GEE reducer instead.");
			const reducerFunc = process.geeReducer(node);
			return imageCollection.reduce(reducerFunc);
		}
	}

	async execute(node) {
		const ee = node.ee;
		// STEP 1: Get parameters and set some variables
		const dc = node.getDataCube('data');
		const frequency = node.getArgument('frequency');

		// STEP 2: prepare image collection with aggregation label
		const images = Commons.setAggregationLabels(node, dc.imageCollection(), frequency);

		// STEP 3: aggregate based on aggregation label

		// Get a unique list of all year/season labels
		const newLabels = ee.List(images.aggregate_array('aggregationLabel')).distinct();

		// Aggregation for each year/season label
		const aggregatedImages = newLabels.map(/*async*/(label) => {
			const collection = images.filterMetadata('aggregationLabel', 'equals', label);
			const firstImg = collection.first();
			const image = /*await*/ this.reduce(node, collection);
			return image.copyProperties({ source: firstImg, properties: firstImg.propertyNames() });
		});

		// STEP 4: Update data cube
		dc.setData(ee.ImageCollection(aggregatedImages));

		const dimensionName = node.getArgument('dimension');
		let dimension = dc.dim(dimensionName);
		if (dimension === null) {
			dimension = dc.dimT();
		}
		const dimLabels = newLabels.getInfo(); // ToDo: Make faster, getInfo is slooow.
		dimension.setValues(dimLabels);

		return dc;
	}

}
