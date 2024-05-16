import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class clip extends GeeProcess {

  static process(ee, data, min, max) {
    if (data instanceof ee.Array) {
      // see https://issuetracker.google.com/issues/325432958
      return data.min(max).max(min);
    }
    else {
      return data.clamp(min, max);
    }
  }

  executeSync(node) {
    const ee = node.ee;
    const min = node.getArgumentAsNumberEE('min');
    const max = node.getArgumentAsNumberEE('max');
		return GeeProcessing.applyUnaryNumericalFunction(node, data => clip.process(ee, data, min, max));
  }

}
