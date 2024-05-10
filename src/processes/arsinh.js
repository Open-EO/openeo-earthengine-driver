import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class arsinh extends GeeProcess {

  executeSync(node) {
    // Using arsinh formula for calculation (see wikipedia)
    return GeeProcessing.applyUnaryNumericalFunction(node, data => data.add(data.pow(2).add(1).sqrt()).log());
  }

}
