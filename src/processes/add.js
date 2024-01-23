import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class add extends GeeProcess {

	executeSync(node) {
		return Commons.reduceBinaryInCallback(
			node,
			(a, b) => a.add(b)
		);
	}

}
