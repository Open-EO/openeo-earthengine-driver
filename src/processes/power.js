import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class power extends GeeProcess {

  executeSync(node) {
    const p = node.getArgumentAsNumberEE('p');
    return GeeProcessing.applyUnaryNumericalFunction(node, data => data.pow(p), 'base');
  }

}
