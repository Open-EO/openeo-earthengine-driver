import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class mean extends GeeProcess {

	executeSync(node) {
		return GeeProcessing.reduceNumericalFunction(node, 'mean');
	}

}
