const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class sd extends Process {

    geeReducer() {
        return 'stdDev';
    }

    async execute(node, context) {
		return node.getData("data");
    }

};