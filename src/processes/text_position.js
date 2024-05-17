import GeeProcess from '../processgraph/process.js';
import If from './if.js';

export default class text_position extends GeeProcess {

  process(data, pattern, case_sensitive) {
    data = If.process(case_sensitive.eq(0), data.toLowerCase(), data);
    pattern = If.process(case_sensitive.eq(0), pattern.toLowerCase(), pattern);
    return data.index(pattern);
  }

  executeSync(node) {
    const data = node.getArgumentAsStringEE('data');
    const pattern = node.getArgumentAsStringEE('pattern');
    const case_sensitive = node.getArgumentAsNumberEE('case_sensitive', true);
    return this.process(data, pattern, case_sensitive);
  }

}
