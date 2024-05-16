import GeeProcess from '../processgraph/process.js';
import Errors from '../utils/errors.js';

export default class array_append extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const data = node.getArgumentAsEE("data");
    const value = node.getArgument("value");
    let label = node.getArgument("label", null);

    if (label !== null && (data instanceof ee.List || data instanceof ee.Array)) {
      throw new Errors.ArrayNotLabeled();
    }

    if (data instanceof ee.List) {
      return data.add(value);
    }
    else if (data instanceof ee.Array) {
      return data.cat([value]);
    }
    else if (data instanceof ee.Dictionary) {
      if (label === null) {
        label = ee.String(data.size());
      }
      // We should throw an LabelExists exception if the label exists,
      // but we can't check that as the info is only known on GEE's side
      return data.set(label, value);
    }

    throw node.invalidArgument("data", "Unsupported data type.");
  }
}
