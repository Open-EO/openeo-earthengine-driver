import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class add extends BaseProcess {

	async execute(node) {
		return Commons.reduceBinaryInCallback(
			node,
			(a,b) => a.add(b),
			(a,b) => a + b
		);
	}

}
