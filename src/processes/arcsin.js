const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class arcsin extends Process {

    async execute(node, context) {
        return Commons.applyInCallback(node, image => image.asin(), array => array.asin());
    }

};