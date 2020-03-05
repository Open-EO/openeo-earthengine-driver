const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class cosh extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.cosh(), x => Math.cosh(x));
    }

};