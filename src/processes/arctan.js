const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class arctan extends Process {

    async execute(node, context) {
        var image_process = function(image){
            return image.atan();
        };
        return Commons.applyInCallback(node, 'x', image_process, ee.Array.atan);
    }

};