import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class linear_scale_range extends GeeProcess {

  executeSync(node) {
    const inputMin = node.getArgument('inputMin');
    const inputMax = node.getArgument('inputMax');
    const outputMin = node.getArgument('outputMin', 0);
    const outputMax = node.getArgument('outputMax', 1);
    return Commons.applyInCallback(
      node,
      image => {
        const numerator = image.subtract(inputMin);
        const denominator = inputMax - inputMin;
        const ratio = numerator.divide(denominator);
        const scaleFactor = outputMax - outputMin;
        return ratio.multiply(scaleFactor).add(outputMin);
      }
    );
  }

}
