import GeeProcess from '../processgraph/process.js';

export default class first extends GeeProcess {

	reducer(node) {
		return node.getArgument('ignore_nodata', true) ? 'firstNonNull' : 'first';
	}

	executeSync(node) {
		const ee = node.ee;
		const data = node.getArgumentAsEE('data');

		if (data instanceof ee.Array) {
			return data.first();
		}
		else if (data instanceof ee.ImageCollection) {
			return data.first();
		}
		else {
			throw node.invalidArgument('data', 'Unsupported datatype');
		}
	}

}
