const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class ln extends Process {

    async execute(node, context) {
        var image_process = function(image){
            return image.log();
        };
        return Commons.applyInCallback(node, 'x', image_process, ee.Array.log);
    }

};