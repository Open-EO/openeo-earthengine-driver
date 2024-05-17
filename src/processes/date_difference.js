import GeeProcess from '../processgraph/process.js';
import If from './if.js';

export default class date_shift extends GeeProcess {

  executeSync(node) {
    // Convert to numerical timestamps in milliseconds
    const x = node.getArgumentAsDateEE('x').millis();
    const min = node.getArgumentAsDateEE('min').millis();
    const max = node.getArgumentAsDateEE('max').millis();
    // Check if the max values are included or excluded
    const exclude_max = node.getArgumentAsNumberEE('exclude_max', false);
    const upper = If.process(node.ee, exclude_max, x.lt(max), x.lte(max));
    return min.lte(x).and(upper);
  }

}
