import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class arsinh extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(
            node,
            image => {
                // Using arsinh formula for calculation (see wikipedia ;)
                var img_p2 = image.pow(2);
                img_p2 = img_p2.add(1);
                img_p2 = img_p2.sqrt();
                var result = image.add(img_p2);
                return result.log();
            },
            x => Math.asinh(x)
        );
    }

}
