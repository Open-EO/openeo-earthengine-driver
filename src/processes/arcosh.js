import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class arcosh extends GeeProcess {

  executeSync(node) {
    // Using arcosh formula for calculation (see wikipedia)
    return GeeUtils.applyNumFunction(node, data => data.add(data.pow(2).subtract(1).sqrt()).log());
  }

}
