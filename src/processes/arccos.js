import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class arccos extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.acos(), x => Math.acos(x));
    }

}
