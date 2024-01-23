import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class product extends GeeProcess {

  geeReducer() {
    return 'product';
  }

  //ToDo processes: ignore_nodata parameter
  executeSync(node) {
    return Commons.reduceInCallback(
      node,
      (a, b) => a.multiply(b),
      (a, b) => a * b
    );
  }
}
