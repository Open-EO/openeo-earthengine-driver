import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class sinh extends GeeProcess {

  executeSync(node) {
    return Commons.applyInCallback(node, image => image.sinh(), x => Math.sinh(x));
  }

}
