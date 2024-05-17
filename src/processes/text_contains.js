import GeeProcess from '../processgraph/process.js';
import text_position from './text_position.js';

export default class text_contains extends GeeProcess {

  executeSync(node) {
    const data = node.getArgumentAsStringEE('data');
    const pattern = node.getArgumentAsStringEE('pattern');
    const case_sensitive = node.getArgumentAsNumberEE('case_sensitive', true);
    return text_position.process(data, pattern, case_sensitive).gte(0);
  }

}
