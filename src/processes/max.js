import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class max extends BaseProcess {

	geeReducer() {
		return 'max';
	}

	async execute(node) {
		return Commons.reduceInCallback(
			node,
			(a, b) => a.max(b),
			(a, b) => Math.max(a, b)
		);
	}

}
