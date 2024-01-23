import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class log extends GeeProcess {

  executeSync(node) {
    const base = node.getArgument('base');
    return Commons.applyInCallback(
      node,
      image => {
        switch (base) {
          case 10:
            return image.log10();
          default:
            return image.log().divide(node.ee.Image(base).log());
        }
      }
    );
  }

}
