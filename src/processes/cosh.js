import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class cosh extends BaseProcess {

  async execute(node) {
    return Commons.applyInCallback(node, image => image.cosh(), x => Math.cosh(x));
  }

}
