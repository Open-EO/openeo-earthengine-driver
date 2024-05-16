import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class last extends GeeProcess {

	executeSync(node) {
		const ignore_nodata = node.getArgument('ignore_nodata', true);
		const reducer = ignore_nodata ? 'lastNonNull' : 'last';
		return GeeProcessing.reduceNumericalFunction(node, reducer);
	}

}
