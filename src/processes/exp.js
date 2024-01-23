import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class exp extends GeeProcess {

  executeSync(node) {
    return Commons.applyInCallback(node, image => image.exp(), x => Math.exp(x));
  }

}
