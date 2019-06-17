const Process = require('../processgraph/process');

module.exports = class pi extends Process {

    async execute(node, context) {
        var dc = node.getData('data');
        dc.data = Math.PI;
        return dc;
    }
};