import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class arcsin extends GeeProcess {

  executeSync(node) {
    return Commons.applyInCallback(node, image => image.asin(), x => Math.asin(x));
  }

}
