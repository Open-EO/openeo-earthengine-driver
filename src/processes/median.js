const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class median extends Process {

    geeReducer() {
        return 'median';
    }

	async execute(node, context) {
		return node.getData("data");
	}

};