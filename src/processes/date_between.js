import GeeProcess from '../processgraph/process.js';
import between from './between.js';

export default class date_between extends GeeProcess {

  executeSync(node) {
    // Convert to numerical timestamps in milliseconds
    const x = node.getArgumentAsDateEE('x').millis();
    const min = node.getArgumentAsDateEE('min').millis();
    const max = node.getArgumentAsDateEE('max').millis();
    // Check if the max values are included or excluded
    const exclude_max = node.getArgumentAsNumberEE('exclude_max', false);
    return between.process(node.ee, x, min, max, exclude_max);
  }

}
