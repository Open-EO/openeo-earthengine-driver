const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class min extends Process {

    geeReducer() {
        return 'min';
    }

	async execute(node, context) {
		return node.getData("data");
	}

};