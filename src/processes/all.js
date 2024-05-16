import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class all extends GeeProcess {

	executeSync(node) {
		return GeeProcessing.reduceNumericalFunction(node, 'allNonZero');
	}

}
