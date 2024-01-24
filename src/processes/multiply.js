import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class multiply extends GeeProcess {

	executeSync(node) {
		return GeeUtils.applyBinaryNumFunction(node, (x, y) => x.multiply(y));
	}

}
