import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class absolute extends BaseProcess {

	async execute(node) {
		return Commons.applyInCallback(node, image => image.abs(), x => Math.abs(x));
	}

}
