import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class int extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.int(), x => parseInt(x, 10));
    }

}
