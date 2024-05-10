import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class normalized_difference extends GeeProcess {

	executeSync(node) {
		return GeeProcessing.applyBinaryNumericalFunction(node, (x, y) => x.subtract(y).divide(x.add(y)));
	}

}
