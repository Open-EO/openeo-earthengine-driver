import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class arctan extends BaseProcess {

  async execute(node) {
    return Commons.applyInCallback(node, image => image.atan(), x => Math.atan(x));
  }

}
