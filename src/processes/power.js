import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class power extends GeeProcess {

  executeSync(node) {
    const p = node.getArgument('p');
    return Commons.applyInCallback(
      node,
      image => image.pow(p),
      x => Math.pow(x, p),
      "base"
    );
  }

}
