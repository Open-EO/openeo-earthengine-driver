const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class sinh extends Process {

    async execute(node, context) {
        var image_process = function(image){
            return image.sinh();
        };
        return Commons.applyInCallback(node, 'x', image_process, ee.Array.sinh);
    }

};