import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class log extends BaseProcess {

    async execute(node) {
        var base = node.getArgument('base');
        return Commons.applyInCallback(
            node,
            image => {
                switch(base) {
                    case 10:
                        return image.log10();
                    default:
                        return image.log().divide(ee.Image(base).log());
                }
            },
            x => {
                switch(base) {
                    case 10:
                        return Math.log10(x);
                    case 2:
                        return Math.log2(x);
                    default:
                        return Math.log(x) / Math.log(base)
                }
            }
        );
    }

}
