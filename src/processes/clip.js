import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class clip extends BaseProcess {

  async execute(node) {
    const min = node.getArgument('min');
    const max = node.getArgument('max');
    return Commons.applyInCallback(
      node,
      image => image.clamp(min, max),
      x => Math.min(Math.max(min, x), max)
    );
  }

}
