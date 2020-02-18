const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class log extends BaseProcess {

    async execute(node) {
        // GEE only supports log with base 10 (or ln).
        //TODO: Check if it is possible to define a base by "log base change formula" (e.g. log3(x) = log10(x)/log10(3))
        return Commons.applyInCallback(node, image => image.log10());
    }

};