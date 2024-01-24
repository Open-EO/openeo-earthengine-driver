import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class tanh extends GeeProcess {

  executeSync(node) {
		return GeeUtils.applyNumFunction(node, data => data.tanh());
  }

}
