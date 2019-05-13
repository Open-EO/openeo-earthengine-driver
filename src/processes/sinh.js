const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class sinh extends Process {

    async execute(node, context) {
        return Commons.applyInCallback(node, ee.Image.sinh, ee.Array.sinh);
    }

};