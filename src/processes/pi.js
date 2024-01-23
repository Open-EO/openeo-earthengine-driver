import GeeProcess from '../processgraph/process.js';

export default class pi extends GeeProcess {

  executeSync(node) {
    return node.ee.Number(Math.PI);
  }

}
