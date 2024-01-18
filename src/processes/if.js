import { BaseProcess } from '@openeo/js-processgraphs';

export default class If extends BaseProcess {

  async execute(node) {
    const value = node.getArgument('value');
    const accept = node.getArgument('accept');
    const reject = node.getArgument('reject');

    return ee.Algorithms.If(value, accept, reject);
    //if (value === true) {
    //    return accept;
    //}
    //else {
    //    return reject;
    //}
  }

}
