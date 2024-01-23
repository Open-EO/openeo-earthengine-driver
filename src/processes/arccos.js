import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class arccos extends GeeProcess {

  executeSync(node) {
    return Commons.applyInCallback(node, image => image.acos(), x => Math.acos(x));
  }

}
