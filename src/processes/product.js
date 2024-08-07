import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class product extends GeeProcess {

	executeSync(node) {
		return GeeProcessing.reduceNumericalFunction(node, 'product', (x, y) => x.multiply(y));
	}

}
