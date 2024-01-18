import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class normalized_difference extends BaseProcess {

	async execute(node) {
		return Commons.reduceBinaryInCallback(
			node,
			(x,y) => x.subtract(y).divide(x.add(y)),
			(x,y) => (x - y) / (x + y)
		);
	}

}
