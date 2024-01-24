import GeeProcess from '../processgraph/process.js';

export default class If extends GeeProcess {

  executeSync(node) {
    const value = node.getArgumentAsEE('value');
    const accept = node.getArgumentAsEE('accept');
    const reject = node.getArgumentAsEE('reject', null);
    return node.ee.Algorithms.If(value, accept, reject);
  }

}
