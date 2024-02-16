import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class If extends GeeProcess {

  static process(ee, value, accept, reject) {
    const acceptType = GeeUtils.getEarthEngineType(ee, accept);
    const rejectType = GeeUtils.getEarthEngineType(ee, reject);
    const result = ee.Algorithms.If(value, accept, reject);
    if (rejectType !== null && acceptType === rejectType) {
      return ee[rejectType](result)
    }
    else {
      return result;
    }
  }

  executeSync(node) {
    const value = node.getArgumentAsEE('value');
    const accept = node.getArgumentAsEE('accept');
    const reject = node.getArgumentAsEE('reject', null);
    return If.process(node.ee, value, accept, reject);
  }

}
