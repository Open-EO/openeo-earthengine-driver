const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class exp extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(node, image => image.exp(), array => array.exp());
        // TODO: implement numbers
        //var p = node.getArgument("p");
        //return ee.Number(p).exp().getInfo();
    }

};