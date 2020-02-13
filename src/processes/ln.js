const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class ln extends Process {

    async execute(node, context) {
        return Commons.applyInCallback(node, image => image.log());
    }

};