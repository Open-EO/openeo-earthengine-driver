import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class linear_scale_range extends BaseProcess {

    async execute(node) {
        var inputMin = node.getArgument('inputMin');
        var inputMax = node.getArgument('inputMax');
        var outputMin = node.getArgument('outputMin', 0);
        var outputMax = node.getArgument('outputMax', 1);
        return Commons.applyInCallback(
            node,
            image => {
                var numerator = image.subtract(inputMin);
                var denominator = inputMax - inputMin;
                var ratio = numerator.divide(denominator);
                var scaleFactor = outputMax - outputMin;
                return ratio.multiply(scaleFactor).add(outputMin);
            },
            x => ((x - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin) + outputMin
        );
    }

}
