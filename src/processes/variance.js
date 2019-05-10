const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class variance extends Process {

    async execute(node, context) {
        return Commons.reduceInCallback(node, 'variance');
    }

};