import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class arsinh extends GeeProcess {

  executeSync(node) {
    // Using arsinh formula for calculation (see wikipedia)
    return GeeUtils.applyNumFunction(node, data => data.add(data.pow(2).add(1).sqrt()).log());
  }

}
