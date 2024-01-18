import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class ceil extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.ceil(), x => Math.ceil(x));
    }

}
