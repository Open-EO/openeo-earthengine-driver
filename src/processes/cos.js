const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class cos extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.cos(), array => array.cos());
    }

};