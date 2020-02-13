const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class power extends Process {

    async execute(node, context) {
        var power = node.getArgument('p');
        return Commons.applyInCallback(node, image => image.pow(power), "base");
    }

};