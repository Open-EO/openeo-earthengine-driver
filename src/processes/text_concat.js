import GeeProcess from '../processgraph/process.js';
import GeeUtils from '../processgraph/utils.js';

export default class text_concat extends GeeProcess {

  executeSync(node) {
    const data = node.getArgumentAsListEE('data', element => GeeUtils.toString(node.ee, element));
    const separator = node.getArgumentAsStringEE('separator', '');
    return data.join(separator);
  }

}
