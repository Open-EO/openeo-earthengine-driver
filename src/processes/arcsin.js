import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class arcsin extends BaseProcess {

  async execute(node) {
    return Commons.applyInCallback(node, image => image.asin(), x => Math.asin(x));
  }

}
