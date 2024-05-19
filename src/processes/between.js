import GeeProcess from '../processgraph/process.js';
import If from './if.js';

export default class between extends GeeProcess {

  static process(ee, x, min, max, exclude_max) {
    const upper = If.process(ee, exclude_max, x.lt(max), x.lte(max));
    return min.lte(x).and(upper);
  }

  executeSync(node) {
    const x = node.getArgumentAsNumberEE('x');
    const min = node.getArgumentAsNumberEE('min');
    const max = node.getArgumentAsNumberEE('max');
    // Check if the max values are included or excluded
    const exclude_max = node.getArgumentAsNumberEE('exclude_max', false);
    return between.process(node.ee, x, min, max, exclude_max);
  }

}
