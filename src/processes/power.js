import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class power extends BaseProcess {

  async execute(node) {
    const p = node.getArgument('p');
    return Commons.applyInCallback(
      node,
      image => image.pow(p),
      x => Math.pow(x, p),
      "base"
    );
  }

}
