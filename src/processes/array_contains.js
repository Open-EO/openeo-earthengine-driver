import GeeProcess from '../processgraph/process.js';

export default class array_contains extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    let data = node.getArgumentAsEE("data");
    const value = node.getArgument("value");

    if (data instanceof ee.Dictionary) {
      data = data.values();
    }
    else if (data instanceof ee.Array) {
      data = data.toList();
    }

    if (data instanceof ee.List) {
      return data.contains(value);
    }

    throw node.invalidArgument("data", "Unsupported data type.");
  }
}
