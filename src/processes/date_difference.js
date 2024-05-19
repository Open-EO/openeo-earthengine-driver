import GeeProcess from '../processgraph/process.js';

export default class date_difference extends GeeProcess {

  executeSync(node) {
    const date = node.getArgumentAsDateEE('date');
    const value = node.getArgumentAsNumberEE('value');
    const unit = node.getArgumentStringEE('unit');
    return date.difference(value, unit);
  }

}
