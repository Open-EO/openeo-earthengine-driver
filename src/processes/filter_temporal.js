import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class filter_temporal extends GeeProcess {

	executeSync(node) {
		return Commons.filterTemporal(node.getDataCube("data"), node.getArgument("extent"), node.getArgument("dimension"));
	}

}
