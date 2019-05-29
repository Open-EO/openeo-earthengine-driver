const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class cos extends Process {

    async execute(node, context) {
        var image_process = function(image){
            return image.cos();
        };
        return Commons.applyInCallback(node, 'x', image_process, ee.Array.cos);
    }

};