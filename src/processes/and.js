import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class and extends GeeProcess {

	executeSync(node) {
		return GeeProcessing.applyBinaryNumericalFunction(node, (x, y) => x.and(y));
	}

}
