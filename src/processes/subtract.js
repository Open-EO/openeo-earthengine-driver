import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class subtract extends GeeProcess {

	executeSync(node) {
		return Commons.reduceBinaryInCallback(
			node,
			(a, b) => a.subtract(b),
			(a, b) => a - b
		);
	}

}
