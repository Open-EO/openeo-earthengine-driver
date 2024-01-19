import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class filter_spatial extends BaseProcess {

	async execute(node) {
		return Commons.filterGeoJSON(node, node.getData("data"), node.getArgument("geometries"), this.id, 'geometries');
	}

}
