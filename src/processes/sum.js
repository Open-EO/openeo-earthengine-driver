import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class sum extends GeeProcess {

	executeSync(node) {
		return GeeProcessing.reduceNumericalFunction(node, 'sum', (x, y) => x.add(y));
	}

}
