import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class multiply extends GeeProcess {

	executeSync(node) {
		return GeeProcessing.applyBinaryNumericalFunction(node, (x, y) => x.multiply(y));
	}

}
