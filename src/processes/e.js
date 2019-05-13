const Process = require('../processgraph/process');

module.exports = class e extends Process {

    async execute(node, context) {
        return Math.E;
    }
};