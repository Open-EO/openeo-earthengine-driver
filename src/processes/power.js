const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

// TODO test implementation
module.exports = class power extends Process {

    async execute(node, context) {
        var power = node.getArgument('p');
        var image_process = function(image){
            return image.pow(power);
        };
        return Commons.applyInCallback(node, 'x', image_process, ee.Array.pow, power);
    }

};