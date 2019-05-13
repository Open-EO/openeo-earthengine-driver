const Process = require('../processgraph/process');

module.exports = class exp extends Process {

    async execute(node, context) {
        var p = node.getArgument("p");
        return ee.Number(p).exp();
    }

};