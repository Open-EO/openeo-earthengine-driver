const Process = require('../processgraph/process');

module.exports = class pi extends Process {

    async execute(node, context) {
        return Math.PI;
    }
};