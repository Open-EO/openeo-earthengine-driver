import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class arcosh extends GeeProcess {

  executeSync(node) {
    // Using arcosh formula for calculation (see wikipedia)
    return GeeProcessing.applyUnaryNumericalFunction(node, data => data.add(data.pow(2).subtract(1).sqrt()).log());
  }

}
