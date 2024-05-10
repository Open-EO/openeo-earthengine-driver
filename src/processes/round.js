import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';
import If from './if.js';

export default class round extends GeeProcess {

  static bankersRounding(ee, number) {
    const rounded = number.round();
    const diff = rounded.subtract(number).abs();

    // Check if the number is halfway between two integers
    return If.process(
      ee,
      diff.eq(0.5),
      // If the number is halfway, round it to the nearest even number
      rounded.divide(2).floor().multiply(2),
      // Otherwise, use the standard rounding
      rounded
    );
  }

  executeSync(node) {
    const ee = node.ee;
    const p = node.getArgumentAsNumberEE("p", 0);
    const scaleFactor = ee.Number(10).pow(p);
    return GeeProcessing.applyUnaryNumericalFunction(node, data => If.process(
      ee,
      p.eq(0),
      // Normal integer rounding
      round.bankersRounding(ee, data),
      // Rounding to decimal precision, ten, hundred, etc.
      round.bankersRounding(ee, data.multiply(scaleFactor)).divide(scaleFactor)
    ));
  }

}
