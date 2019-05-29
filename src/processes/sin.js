const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class sin extends Process {

    async execute(node, context) {
        var image_process = function(image){
            return image.sin();
        };
        return Commons.applyInCallback(node, 'x', image_process, ee.Array.sin);
    }

};