import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class product extends GeeProcess {

	executeSync(node) {
		return GeeProcessing.reduceNumericalFunction(node, ee => ee.Reducer.product);
	}

}
