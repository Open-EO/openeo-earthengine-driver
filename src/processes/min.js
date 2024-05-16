import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class min extends GeeProcess {

	executeSync(node) {
		return GeeProcessing.reduceNumericalFunction(node, 'min');
	}

}
