import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';
import clip from './clip.js';

export default class linear_scale_range extends GeeProcess {

  executeSync(node) {
    const inputMin = node.getArgumentAsNumberEE('inputMin');
    const inputMax = node.getArgumentAsNumberEE('inputMax');
    const outputMin = node.getArgumentAsNumberEE('outputMin', 0);
    const outputMax = node.getArgumentAsNumberEE('outputMax', 1);
    return GeeUtils.applyNumFunction(node, data => {
      const clipped = clip.process(node.ee, data, inputMin, inputMax);
      return clipped.subtract(inputMin).divide(inputMax.subtract(inputMin)).multiply(outputMax.subtract(outputMin)).add(outputMin);
  });
  }

}
