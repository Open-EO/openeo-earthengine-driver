const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class linear_scale_range extends Process {

    async execute(node, context) {
        var inputMin = node.getArgument('inputMin');
        var inputMax = node.getArgument('inputMax');
        var outputMin = node.getArgument('outputMin');
        var outputMax = node.getArgument('outputMax');
        if (outputMin == null){
            outputMin = 0
        }
        if (outputMax == null){
            outputMax = 1
        }
        var process = function(image){
            var numerator = image.subtract(inputMin);
            var denominator = inputMax - inputMin;
            var ratio = numerator.divide(denominator);
            var scaleFactor = outputMax - outputMin;
            return ratio.multiply(scaleFactor).add(outputMin);
        };
        return Commons.applyInCallback(node, 'x', process, process);
    }

};