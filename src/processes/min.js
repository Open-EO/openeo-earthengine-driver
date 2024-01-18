import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class min extends BaseProcess {

	geeReducer() {
		return 'min';
	}

	async execute(node) {
		return Commons.reduceInCallback(
			node,
			(a, b) => a.min(b),
			(a, b) => Math.min(a, b)
		);
	}

}
