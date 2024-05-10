import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';
import If from './if.js';

export default class log extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const base = node.getArgumentAsNumberEE('base');
		return GeeProcessing.applyUnaryNumericalFunction(ee, data => If.process(
      ee,
      base.eq(10),
      data.log10(),
      data.log().divide(base.log())
    ));
  }

}
