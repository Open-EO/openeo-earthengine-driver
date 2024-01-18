import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class divide extends BaseProcess {

	//TODO processes: Introducing DivisionByZero error
	async execute(node) {
		return Commons.reduceBinaryInCallback(
			node,
			(a,b) => a.divide(b),
			(a,b) => a / b
		);
	}

}
