import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class filter_spatial extends GeeProcess {

	executeSync(node) {
		return Commons.filterGeoJSON(node, node.getData("data"), node.getArgument("geometries"), this.id, 'geometries');
	}

}
