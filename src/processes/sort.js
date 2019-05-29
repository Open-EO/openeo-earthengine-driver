const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

// TODO: complete implementation
module.exports = class sort extends Process {

    async execute(node, context) {
        var dimension = node.getArgument("dimension");
        var asc = node.getArgument("asc");
        return Commons.applyDimensionInCallback(node, 'sort', dimension, asc);
    }

};