import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class filter_bbox extends GeeProcess {

	executeSync(node) {
		return Commons.filterBbox(node, node.getDataCube("data"), node.getArgument("extent"), this.id, 'extent');
	}

}
