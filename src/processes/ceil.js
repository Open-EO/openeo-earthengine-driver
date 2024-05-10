import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class ceil extends GeeProcess {

  executeSync(node) {
		return GeeProcessing.applyUnaryNumericalFunction(node, data => data.ceil());
  }

}
