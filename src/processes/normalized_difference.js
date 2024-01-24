import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class normalized_difference extends GeeProcess {

	executeSync(node) {
		return GeeUtils.applyBinaryNumFunction(node, (x, y) => x.subtract(y).divide(x.add(y)));
	}

}
