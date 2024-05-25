import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class count extends GeeProcess {

	executeSync(node) {
		const condition = node.getArgument("condition");
		let reducer;
		if (condition === true) {
			// Seems buggy: https://issuetracker.google.com/issues/342705677
			reducer = 'countEvery';
		}
		else if (condition === null) {
			// openEO asks to not count infinity, nan and no data values
			// GEE doesn't handle infinity and nan and often uses null or 0 as no data values.
			// As such the closest we can get is to count all values that are not null.
			reducer = 'count';
		}
		else {
			throw node.invalidArgument("condition", "Unsupported value, must be one of `null` or `true`.");
		}
		return GeeProcessing.reduceNumericalFunction(node, [reducer, 'count']);
	}

}
