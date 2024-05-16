import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';
import clip from './clip.js';

export default class linear_scale_range extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const inputMin = node.getArgumentAsNumberEE('inputMin');
    const inputMax = node.getArgumentAsNumberEE('inputMax');
    const outputMin = node.getArgumentAsNumberEE('outputMin', 0);
    const outputMax = node.getArgumentAsNumberEE('outputMax', 1);
    return GeeProcessing.applyUnaryNumericalFunction(node, data => {
      const clipped = clip.process(ee, data, inputMin, inputMax);
      return clipped.subtract(inputMin).divide(inputMax.subtract(inputMin)).multiply(outputMax.subtract(outputMin)).add(outputMin);
  });
  }

}
