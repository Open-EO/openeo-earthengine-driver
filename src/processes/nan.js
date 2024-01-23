import GeeProcess from '../processgraph/process.js';

export default class nan extends GeeProcess {

  executeSync(node) {
    return node.ee.Number(NaN);
  }
}
