import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class round extends BaseProcess {

  // ToDo processes: Check whether GEE and JS really follow IEEE 754 rounding behavior
  async execute(node) {
    const p = node.getArgument("p");
    const scaleFactor = p !== null ? 10 ** p : null;
    return Commons.applyInCallback(
      node,
      image => {
        if (p === null) {
          return image.round();
        }
        else {
          return image.multiply(scaleFactor).round().divide(scaleFactor);
        }
      },
      x => {
        if (p === null) {
          return Math.round(x);
        }
        else {
          return Math.round(x * scaleFactor) / scaleFactor;
        }
      }
    );
  }

}
