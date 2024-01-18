import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class subtract extends BaseProcess {

	async execute(node) {
		return Commons.reduceBinaryInCallback(
			node,
			(a, b) => a.subtract(b),
			(a, b) => a - b
		);
	}

}
