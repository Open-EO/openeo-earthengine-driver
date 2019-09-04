const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class mean extends Process {

    geeReducer() {
        return 'mean';
    }

	async execute(node, context) {
		throw "Not implemented yet.";
	}

};