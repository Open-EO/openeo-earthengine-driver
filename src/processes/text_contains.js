import GeeProcess from '../processgraph/process.js';

export default class text_contains extends GeeProcess {

  executeSync(node) {
    let data = node.getArgumentAsStringEE('data');
    let pattern = node.getArgumentAsStringEE('pattern');
    const case_sensitive = node.getArgument('case_sensitive');
    if (!case_sensitive) {
      data = data.toLowerCase();
      pattern = pattern.toLowerCase();
    }
    return data.index(pattern).gte(0);
  }

}
