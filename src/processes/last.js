const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class last extends Process {

	geeReducer(node) {
		return node.getArgument('ignore_nodata', true) ? 'lastNonNull' : 'last';
	}

	async execute(node, context) {
		throw "Not implemented yet.";
	}

};