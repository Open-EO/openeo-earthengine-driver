import GeeProcess from '../processgraph/process.js';

export default class array_concat extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const array1 = node.getArgumentAsEE("array1");
    let array2 = node.getArgumentAsEE("array2");

    if (array1 instanceof ee.List) {
      if (array2 instanceof ee.Array) {
        array2 = array2.toList();
      }
      else if (array2 instanceof ee.Dictionary) {
        array2 = array2.values();
      }
      if (array2 instanceof ee.List) {
        return array1.cat(array2);
      }
      throw node.invalidArgument("array2", "Unsupported data type.");
    }
    else if (array1 instanceof ee.Array) {
      if (array2 instanceof ee.Dictionary) {
        array2 = array2.values();
      }
      if (array2 instanceof ee.List || array2 instanceof ee.Array) {
        return array1.cat(array2);
      }
      throw node.invalidArgument("array2", "Unsupported data type.");
    }
    else if (array1 instanceof ee.Dictionary) {
      if (array2 instanceof ee.Array) {
        array2 = array2.toList();
      }
      if (array2 instanceof ee.List) {
        const keyStart = array1.size();
        const keyEnd = array1.size().add(array2.length()).subtract(1);
        const keys = ee.List.sequence(keyStart, keyEnd).map(x => ee.String(ee.Number(x).int()));
        array2 = ee.Dictionary.fromLists(keys, array2);
      }
      if (array2 instanceof ee.Dictionary) {
        return array1.combine(array2);
      }
      throw node.invalidArgument("array2", "Unsupported data type.");
    }

    throw node.invalidArgument("array1", "Unsupported data type.");
  }
}
