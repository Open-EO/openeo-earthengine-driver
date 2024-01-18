import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class ln extends BaseProcess {

  async execute(node) {
    return Commons.applyInCallback(node, image => image.log(), x => Math.log(x));
  }

}
