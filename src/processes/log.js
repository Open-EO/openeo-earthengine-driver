import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';
import If from './if.js';

export default class log extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const base = node.getArgumentAsNumberEE('base');
		return GeeUtils.applyNumFunction(ee, data => If.process(
      ee,
      base.eq(10),
      data.log10(),
      data.log().divide(base.log())
    ));
  }

}
