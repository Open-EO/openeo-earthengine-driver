const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class ceil extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.ceil());
    }

};