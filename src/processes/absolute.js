const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class absolute extends Process {

    async execute(node, context) {
        var image_process = function(image){
            return image.abs();
        };
        return Commons.applyInCallback(node, 'x', image_process, ee.Array.abs);
    }

};