import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class log extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const base = node.getArgumentAsNumberEE('base');
		return GeeUtils.applyNumFunction(node, data => ee.Algorithms.If(
      base.eq(10),
      data.log10(),
      data.log().divide(base.log())
    ));
  }

}
