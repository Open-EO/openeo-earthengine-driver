import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class artanh extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(
            node,
            image => {
                // Using artanh formula for calculation (see wikipedia ;)
                var img_p1 = image.add(1);
                var img_p2 = image.subtract(1);
                img_p2 = img_p2.multiply(-1);
                var result = img_p1.divide(img_p2);
                result = result.log();
                return result.multiply(0.5);
            },
            x => Math.atanh(x)
        );
    }

}
