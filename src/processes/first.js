const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class first extends Process {

    geeReducer() {
        return 'first';
    }

    async execute(node, context) {
		return node.getData("data");
    }

};