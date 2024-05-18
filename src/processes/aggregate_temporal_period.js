import GeeProcess from '../processgraph/process.js';
import GeeClimateUtils from './utils/climate.js';

export default class aggregate_temporal_period extends GeeProcess {

	reduce(node, imageCollection) {
		const callback = node.getCallback('reducer');
		if (callback.getNodeCount() !== 1) {
			throw node.invalidArgument('reducer', 'No complex reducer supported at the moment');
		}
		else {
			// This is a simple reducer with just one node
			const childNode = callback.getResultNode();
			const process = callback.getProcess(childNode);
			if (typeof process.geeReducer !== 'function') {
				throw node.invalidArgument('reducer', 'The specified reducer is invalid.');
			}
			node.debug("Bypassing node " + childNode.id + "; Executing as native GEE reducer instead.");
			const reducerFunc = process.geeReducer(node);
			return imageCollection.reduce(reducerFunc);
		}
	}

	executeSync(node) {
		const ee = node.ee;
		// STEP 1: Get parameters and set some variables
		const dc = node.getDataCubeWithEE('data');
		const period = node.getArgument('period');
		const data = node.getData();
		if (!(data instanceof ee.ImageCollection)) {
			throw node.invalidArgument('data', 'Data must have a temporal dimension and/or more than one timestamp.');
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
			const image = this.reduce(node, collection);
			return image.copyProperties({ source: firstImg, properties: firstImg.propertyNames() });
		});

		// STEP 4: Update data cube
		dc.setData(ee.ImageCollection(aggregatedImages));

		const dimensionName = node.getArgument('dimension');
		let dimension = dc.dim(dimensionName);
		if (dimension === null) {
			dimension = dc.dimT();
		}
		node.warn('Inspecting GEE objects (for dimension labels) via getInfo() is slow. Do not use this in production.');
		dimension.setValues(newLabels.getInfo()); // ToDo: Make faster, getInfo is slow.

		return dc;
	}

}
