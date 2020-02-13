const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class arcsin extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.asin(), array => array.asin());
    }

};