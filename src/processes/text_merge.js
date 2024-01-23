import GeeProcess from '../processgraph/process.js';

export default class text_merge extends GeeProcess {

  executeSync(node) {
    const data = node.getArgument('data');
    let separator = node.getArgument('separator');

    if (separator === null) {
      separator = "";
    }

    return data.join(separator);
  }

}
