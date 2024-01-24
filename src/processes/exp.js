import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class exp extends GeeProcess {

  executeSync(node) {
		return GeeUtils.applyNumFunction(node, data => data.exp());
  }

}
