import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class max extends GeeProcess {

	geeReducer() {
		return 'max';
	}

	executeSync(node) {
		return Commons.reduceInCallback(
			node,
			(a, b) => a.max(b),
			(a, b) => Math.max(a, b)
		);
	}

}
