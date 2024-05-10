import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class sgn extends GeeProcess {

  executeSync(node) {
		return GeeProcessing.applyUnaryNumericalFunction(node, data => data.signum());
  }

}
