const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class log extends Process {

    async execute(node, context) {
        // GEE only supports log with base 10 (or ln).
        return Commons.applyInCallback(node, image => image.log10(), array => array.log10());
    }

};