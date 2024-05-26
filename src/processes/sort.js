import GeeProcess from '../processgraph/process.js';

export default class sort extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    let data = node.getArgumentAsEE("data");
    const value = node.getArgument("asc", true);

    const sortList = list => {
      list = list.sort();
      if (!value) {
        list = list.reverse();
      }
      return list;
    };

    if (data instanceof ee.List) {
      return sortList(data)
    }
    else if (data instanceof ee.Array) {
      return ee.Array(sortList(data.toList()));
    }

    throw node.invalidArgument("data", "Unsupported data type.");
  }
}
