import GeeProcess from '../processgraph/process.js';
import Errors from '../utils/errors.js';

export default class first extends GeeProcess {

	geeReducer(node) {
		return node.getArgument('ignore_nodata', true) ? 'firstNonNull' : 'first';
	}

	executeSync(node) {
		const ee = node.ee;
		const data = node.getArgument('data');

		if (Array.isArray(data)) {
			return data[0];
		}
		else if (data instanceof ee.Array) {
			return data.toList().get(0);
		}
		else if (data instanceof ee.ImageCollection) {
			return data.first();
		}
		else {
			throw new Errors.ProcessArgumentInvalid();
		}
	}

}
