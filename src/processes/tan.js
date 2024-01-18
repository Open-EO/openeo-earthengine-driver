import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class tan extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.tan(), x => Math.tan(x));
    }

}
