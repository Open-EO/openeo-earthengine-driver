const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class cos extends Process {

    async execute(node, context) {
        return Commons.applyInCallback(node, image => image.cos(), array => array.cos());
    }

};