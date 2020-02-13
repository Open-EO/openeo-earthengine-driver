const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class power extends BaseProcess {

    async execute(node) {
        var power = node.getArgument('p');
        return Commons.applyInCallback(node, image => image.pow(power),
                array => array.pow(power), "base");
    }

};