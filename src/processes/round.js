import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class round extends GeeProcess {

  // ToDo processes: Check whether GEE and JS really follow IEEE 754 rounding behavior
  executeSync(node) {
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
      }
    );
  }

}
