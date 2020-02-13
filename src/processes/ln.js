const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class ln extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.log(), array => array.log());
    }

};