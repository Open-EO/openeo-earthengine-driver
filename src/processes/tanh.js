const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class tanh extends Process {

    async execute(node, context) {
        return Commons.applyInCallback(node, 'tanh');
    }

};