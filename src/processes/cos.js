import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class cos extends GeeProcess {

  executeSync(node) {
		return GeeUtils.applyNumFunction(node, data => data.cos());
  }

}
