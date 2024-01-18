import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class tanh extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.tanh(), x => Math.tanh(x));
    }

}
