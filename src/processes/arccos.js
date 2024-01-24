import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class arccos extends GeeProcess {

  executeSync(node) {
		return GeeUtils.applyNumFunction(node, data => data.acos());
  }

}
