import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class arcsin extends GeeProcess {

  executeSync(node) {
		return GeeProcessing.applyUnaryNumericalFunction(node, data => data.asin());
  }

}
