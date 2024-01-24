import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class artanh extends GeeProcess {

  executeSync(node) {
    // Using artanh formula for calculation (see wikipedia)
    return GeeUtils.applyNumFunction(node, data => data.add(1).divide(data.multiply(-1).add(1)).log().multiply(0.5));
  }

}
