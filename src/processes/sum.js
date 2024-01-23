import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class sum extends GeeProcess {

	geeReducer() {
		return 'sum';
	}

	//ToDo processes: ignore_nodata parameter
	executeSync(node) {
		return Commons.reduceInCallback(
			node,
			(a, b) => a.add(b),
			(a, b) => a + b
		);
	}

}
