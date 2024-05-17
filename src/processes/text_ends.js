import GeeProcess from '../processgraph/process.js';
import text_position from './text_position.js';

export default class text_ends extends GeeProcess {

  executeSync(node) {
    const data = node.getArgumentAsStringEE('data');
    const pattern = node.getArgumentAsStringEE('pattern');
    const case_sensitive = node.getArgumentAsNumberEE('case_sensitive', true);
    const expectedPos = data.length().subtract(pattern.length());
    return text_position.process(data, pattern, case_sensitive).eq(expectedPos);
  }

}
