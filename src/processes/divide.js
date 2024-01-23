import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class divide extends GeeProcess {

	//TODO processes: Introducing DivisionByZero error
	executeSync(node) {
		return Commons.reduceBinaryInCallback(
			node,
			(a, b) => a.divide(b),
			(a, b) => a / b
		);
	}

}
