const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class clip extends Process {

    async execute(node, context) {
        var min = node.getArgument('min');
        var max = node.getArgument('max');
        return Commons.applyInCallback(node, image => image.clamp(min, max)); // Not supported for arrays
    }

};