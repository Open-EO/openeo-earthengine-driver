import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class multiply extends BaseProcess {

	async execute(node) {
		return Commons.reduceBinaryInCallback(
			node,
			(a, b) => a.multiply(b),
			(a, b) => a * b
		);
	}

}
