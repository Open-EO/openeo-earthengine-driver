import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class cos extends BaseProcess {

  async execute(node) {
    return Commons.applyInCallback(node, image => image.cos(), x => Math.cos(x));
  }

}
