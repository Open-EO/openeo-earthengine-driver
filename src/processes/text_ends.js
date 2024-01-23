import GeeProcess from '../processgraph/process.js';

export default class text_ends extends GeeProcess {

  executeSync(node) {
    let data = node.getArgumentAsStringEE('data');
    let pattern = node.getArgumentAsStringEE('pattern');
    const case_sensitive = node.getArgument('case_sensitive');
    if (!case_sensitive) {
      data = data.toLowerCase();
      pattern = pattern.toLowerCase();
    }
    const expectedPos = data.length().subtract(pattern.length());
    return data.index(pattern).eq(expectedPos);
  }

}
