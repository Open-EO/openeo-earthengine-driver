import GeeProcess from '../processgraph/process.js';

export default class e extends GeeProcess {

  executeSync(node) {
    const dc = node.getDataCube('data');
    dc.setData(Math.E);
    return dc;
  }
}
