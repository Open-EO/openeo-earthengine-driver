const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class arccos extends Process {

    async execute(node, context) {
        return Commons.applyInCallback(node, image => image.acos(), array => array.acos());
    }

};