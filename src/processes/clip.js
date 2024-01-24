import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class clip extends GeeProcess {

  static process(ee, data, min, max) {
    if (data instanceof ee.Array) {
      return data.min(max).max(min);
    }
    else {
      return data.clamp(min, max);
    }
  }

  executeSync(node) {
    const min = node.getArgumentAsNumberEE('min');
    const max = node.getArgumentAsNumberEE('max');
		return GeeUtils.applyNumFunction(node, data => clip.process(node.ee, data, min, max));
  }

}
