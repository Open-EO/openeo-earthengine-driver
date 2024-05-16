import GeeProcess from '../processgraph/process.js';
import GeeTypes from './utils/processing.js';

export default class text_concat extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const data = node.getArgumentAsListEE('data', element => GeeTypes.toString(ee, element));
    const separator = node.getArgumentAsStringEE('separator', '');
    return data.join(separator);
  }

}
