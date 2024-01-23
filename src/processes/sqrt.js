import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class sqrt extends GeeProcess {

  executeSync(node) {
    return Commons.applyInCallback(node, image => image.sqrt(), x => Math.sqrt(x));
  }

}
