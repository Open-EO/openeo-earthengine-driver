import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class exp extends BaseProcess {

  async execute(node) {
    return Commons.applyInCallback(node, image => image.exp(), x => Math.exp(x));
  }

}
