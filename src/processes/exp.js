const Process = require('../processgraph/process');

module.exports = class exp extends Process {

    async execute(node, context) {
        return Commons.applyInCallback(node, image => image.exp(), array => array.exp());
        // TODO: implement numbers
        //var p = node.getArgument("p");
        //return ee.Number(p).exp().getInfo();
    }

};