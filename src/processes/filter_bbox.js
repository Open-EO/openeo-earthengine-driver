import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class filter_bbox extends BaseProcess {

	async execute(node) {
		return Commons.filterBbox(node.getDataCube("data"), node.getArgument("extent"), this.id, 'extent');
	}

}
