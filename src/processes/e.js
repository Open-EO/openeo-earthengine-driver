const Process = require('../processgraph/process');

module.exports = class e extends Process {

    async execute(node, context) {
        var dc = node.getData('data');
        dc.data = Math.E;
        return dc;
    }
};