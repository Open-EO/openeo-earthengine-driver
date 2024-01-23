import GeeProcess from '../processgraph/process.js';

export default class pi extends GeeProcess {

  executeSync(node) {
    let dc = node.getDataCube('data');
    dc.setData(Math.PI);
    return dc;
  }
}
