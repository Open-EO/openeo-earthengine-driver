const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class last extends Process {

    geeReducer() {
        return 'last';
    }

    async execute(node, context) {
		return node.getData("data");
    }

};