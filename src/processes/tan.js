import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class tan extends GeeProcess {

  executeSync(node) {
		return GeeUtils.applyNumFunction(node, data => data.tan());
  }

}
