import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class max extends GeeProcess {

	executeSync(node) {
		return GeeProcessing.reduceNumericalFunction(node, 'max', (x, y) => x.max(y));
	}

}
