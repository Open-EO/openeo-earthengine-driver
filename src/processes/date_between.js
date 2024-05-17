import GeeProcess from '../processgraph/process.js';

export default class date_shift extends GeeProcess {

  executeSync(node) {
    const date = node.getArgumentAsDateEE('date');
    const value = node.getArgumentAsNumberEE('value');
    const unit = node.getArgumentAsStringEE('unit');
    return date.advance(value, unit);
  }

}
