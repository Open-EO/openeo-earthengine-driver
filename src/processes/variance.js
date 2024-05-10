import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class variance extends GeeProcess {

	executeSync(node) {
		return GeeProcessing.reduceNumericalFunction(node, ee => ee.Reducer.variance);
	}

}
