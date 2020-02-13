const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class int extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.int());
    }

};