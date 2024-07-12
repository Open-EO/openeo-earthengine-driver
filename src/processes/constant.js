import GeeProcess from '../processgraph/process.js';
import GeeTypes from './utils/types.js';

export default class constant extends GeeProcess {

  executeSync(node) {
    const jsValue = node.getArgument('x');
    const eeValue = GeeTypes.jsToEE(node.ee, node.getLogger(), jsValue);
    if (eeValue !== null) {
      return eeValue;
    }
    else {
      throw this.invalidArgument("x", 'Datatype not supported by Google Earth Engine');
    }
  }

}
