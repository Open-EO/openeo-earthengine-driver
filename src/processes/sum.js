import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class sum extends BaseProcess {

	geeReducer() {
		return 'sum';
	}

    //ToDo processes: ignore_nodata parameter
	async execute(node) {
		return Commons.reduceInCallback(
			node,
			(a,b) => a.add(b),
			(a,b) => a + b
		);
	}

}
