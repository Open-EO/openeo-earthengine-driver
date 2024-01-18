import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class sin extends BaseProcess {

  async execute(node) {
    return Commons.applyInCallback(node, image => image.sin(), x => Math.sin(x));
  }

}
