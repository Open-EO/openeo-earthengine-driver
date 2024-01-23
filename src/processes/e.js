import GeeProcess from '../processgraph/process.js';

export default class e extends GeeProcess {

  executeSync(node) {
    return node.ee.Number(Math.E);
  }
}
