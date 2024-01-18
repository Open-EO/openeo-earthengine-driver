import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class filter_temporal extends BaseProcess {

	async execute(node) {
		return Commons.filterTemporal(node.getDataCube("data"), node.getArgument("extent"), node.getArgument("dimension"));
	}

}
