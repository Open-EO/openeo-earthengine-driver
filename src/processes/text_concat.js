import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class text_concat extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const data = node.getArgumentAsListEE('data', element => GeeUtils.toString(ee, element));
    let separator = node.getArgument('separator', null);
    if (separator === null) {
      separator = ee.String("");
    }
    else {
      separator = GeeUtils.toString(ee, separator);
    }
    return data.join(separator);
  }

}
