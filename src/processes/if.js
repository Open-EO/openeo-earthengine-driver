import GeeProcess from '../processgraph/process.js';
import GeeTypes from './utils/types.js';

export default class If extends GeeProcess {

  static process(ee, value, accept, reject) {
    const acceptType = GeeTypes.getEarthEngineType(ee, accept);
    const rejectType = GeeTypes.getEarthEngineType(ee, reject);
    const result = ee.Algorithms.If(value, accept, reject);
    if (rejectType !== null && acceptType === rejectType) {
      return ee[rejectType](result)
    }
    else {
      return result;
    }
  }

  executeSync(node) {
    // todo: handle data cubes
    // need the dc to be available on GEE
    // the DC class needs to be synced between openEO driver and GEE
    const ee = node.ee;
    const value = node.getArgumentAsEE('value');
    const accept = node.getArgumentAsEE('accept');
    const reject = node.getArgumentAsEE('reject', null);
    return If.process(ee, value, accept, reject);
  }

}
