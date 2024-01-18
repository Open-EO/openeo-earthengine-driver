import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class product extends BaseProcess {

	geeReducer() {
		return 'product';
	}

    //ToDo processes: ignore_nodata parameter
    async execute(node) {
        return Commons.reduceInCallback(
            node,
            (a,b) => a.multiply(b),
            (a,b) => a * b
        );
    }
}
