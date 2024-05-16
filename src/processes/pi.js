import GeeProcess from '../processgraph/process.js';

export default class pi extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    return ee.Number(Math.PI);
  }

}
