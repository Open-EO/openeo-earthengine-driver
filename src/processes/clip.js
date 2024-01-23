import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class clip extends GeeProcess {

  executeSync(node) {
    const min = node.getArgument('min');
    const max = node.getArgument('max');
    return Commons.applyInCallback(
      node,
      image => image.clamp(min, max)
    );
  }

}
