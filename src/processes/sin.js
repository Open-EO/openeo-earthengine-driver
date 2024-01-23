import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class sin extends GeeProcess {

  executeSync(node) {
    return Commons.applyInCallback(node, image => image.sin(), x => Math.sin(x));
  }

}
