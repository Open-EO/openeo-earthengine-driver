import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class power extends GeeProcess {

  executeSync(node) {
    const p = node.getArgumentAsNumberEE('p');
    return GeeUtils.applyNumFunction(node, data => data.pow(p), 'base');
  }

}
