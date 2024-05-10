import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class arccos extends GeeProcess {

  executeSync(node) {
		return GeeProcessing.applyUnaryNumericalFunction(node, data => data.acos());
  }

}
