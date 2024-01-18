import { BaseProcess } from '@openeo/js-processgraphs';
import Errors from '../utils/errors.js';

export default class first extends BaseProcess {

	geeReducer(node) {
		return node.getArgument('ignore_nodata', true) ? 'firstNonNull' : 'first';
	}

	async execute(node) {
		const data = node.getArgument('data');

		if (Array.isArray(data)) {
			return data[0];
		}
		else if (data instanceof ee.Array) {
			return data.toList().get(0);
		}
		else if (data instanceof ee.ImageCollection) {
			return data.first();
		}
		else {
			throw new Errors.ProcessArgumentInvalid();
		}
	}

}
