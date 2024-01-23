import GeeProcess from '../processgraph/process.js';

export default class If extends GeeProcess {

  executeSync(node) {
    const value = node.getArgument('value');
    const accept = node.getArgument('accept');
    const reject = node.getArgument('reject');

    return node.ee.Algorithms.If(value, accept, reject);
    //if (value === true) {
    //    return accept;
    //}
    //else {
    //    return reject;
    //}
  }

}
