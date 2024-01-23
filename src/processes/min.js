import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class min extends GeeProcess {

	geeReducer() {
		return 'min';
	}

	executeSync(node) {
		return Commons.reduceInCallback(
			node,
			(a, b) => a.min(b),
			(a, b) => Math.min(a, b)
		);
	}

}
