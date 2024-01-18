import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class sinh extends BaseProcess {

  async execute(node) {
    return Commons.applyInCallback(node, image => image.sinh(), x => Math.sinh(x));
  }

}
