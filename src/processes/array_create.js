import GeeProcess from '../processgraph/process.js';

export default class array_create extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const data = node.getArgumentAsListEE("data", []);
    const repeat = node.getArgumentAsNumberEE("repeat", 1);
    return ee.List(ee.List.sequence(1, repeat).iterate((i, newList) => ee.List(newList).cat(data), ee.List([])));
  }
}
