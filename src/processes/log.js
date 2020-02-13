const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class log extends BaseProcess {

    async execute(node) {
        // GEE only supports log with base 10 (or ln).
        return Commons.applyInCallback(node, image => image.log10());
    }

};