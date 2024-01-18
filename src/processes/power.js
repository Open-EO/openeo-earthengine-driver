import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class power extends BaseProcess {

    async execute(node) {
        var power = node.getArgument('p');
        return Commons.applyInCallback(
            node,
            image => image.pow(power),
            x => Math.pow(x, power),
            "base"
        );
    }

}
