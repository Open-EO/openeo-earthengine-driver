const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class sum extends Process {

    geeReducer() {
        return 'sum';
    }

    async execute(node, context) {
		return node.getData("data");
    }

};