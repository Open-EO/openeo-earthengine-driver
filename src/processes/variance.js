const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class variance extends Process {

	geeReducer() {
		return 'variance';
	}

	async execute(node, context) {
		throw "Not implemented yet.";
	}

};