import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class normalized_difference extends GeeProcess {

	executeSync(node) {
		return Commons.reduceBinaryInCallback(
			node,
			(x, y) => x.subtract(y).divide(x.add(y)),
			(x, y) => (x - y) / (x + y)
		);
	}

}
