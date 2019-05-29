const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class int extends Process {

    async execute(node, context) {
        var image_process = function(image){
            return image.int();
        };
        return Commons.applyInCallback(node, 'x', image_process, ee.Array.int);
    }

};