const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class cosh extends Process {

    async execute(node, context) {
        return Commons.applyInCallback(node, image => image.cosh(), array => array.cosh());
    }

};