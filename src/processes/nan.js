import GeeProcess from '../processgraph/process.js';

export default class nan extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    return ee.Number(NaN);
  }
}
