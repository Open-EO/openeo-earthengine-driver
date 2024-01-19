import { BaseProcess } from '@openeo/js-processgraphs';
import Errors from '../utils/errors.js';

export default class last extends BaseProcess {

	geeReducer(node) {
		return node.getArgument('ignore_nodata', true) ? 'lastNonNull' : 'last';
	}

	async execute(node) {
		const ee = node.ee;
		const data = node.getArgument('data');

		if (Array.isArray(data)) {
			return [data[data.length - 1]];
		}
		else if (data instanceof ee.Array) {
			let data_list = data.toList();
			data_list = data_list.reverse();
			return data_list.get(0);
		}
		else if (data instanceof ee.ImageCollection) {
			return data.toList(data.size()).get(-1);
		}
		else {
			throw new Errors.ProcessArgumentInvalid();
		}
	}

}
