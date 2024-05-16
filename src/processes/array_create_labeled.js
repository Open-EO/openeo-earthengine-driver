import GeeProcess from '../processgraph/process.js';
import GeeTypes from './utils/types.js';

export default class array_create_labeled extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const values = node.getArgument("data");
    const keys = node.getArgument("labels");
    const eeKeys = ee.List(keys).map(x => GeeTypes.toString(x));
    return ee.Dictionary.fromLists(eeKeys, values);
  }
}
