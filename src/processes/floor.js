import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class floor extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.floor(), x => Math.floor(x));
    }

}
