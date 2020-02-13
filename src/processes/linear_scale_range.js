const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class linear_scale_range extends Process {

    process(data, inputMin, inputMax, outputMin, outputMax){
        var numerator = data.subtract(inputMin);
        var denominator = inputMax - inputMin;
        var ratio = numerator.divide(denominator);
        var scaleFactor = outputMax - outputMin;
        return ratio.multiply(scaleFactor).add(outputMin);
    }

    async execute(node, context) {
        var inputMin = node.getArgument('inputMin');
        var inputMax = node.getArgument('inputMax');
        var outputMin = node.getArgument('outputMin', 0);
        var outputMax = node.getArgument('outputMax', 1);
        return Commons.applyInCallback(node, data => this.process(data, inputMin, inputMax, outputMin, outputMax));
    }

};