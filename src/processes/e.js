import GeeProcess from '../processgraph/process.js';

export default class e extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    return ee.Number(Math.E);
  }
}
