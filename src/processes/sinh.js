const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class sinh extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.sinh(), array => array.sinh());
    }

};