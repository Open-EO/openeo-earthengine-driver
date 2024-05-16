import GeeProcess from '../processgraph/process.js';

export default class array_create extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const data = node.getArgument("data", []);
    const repeat = node.getArgument("repeat", 1);

    let list = ee.List(data);
    for (let i = 1; i < repeat; i++) {
      list = list.cat(data);
    }
    return list;
  }
}
