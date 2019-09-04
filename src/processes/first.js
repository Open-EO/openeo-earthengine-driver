const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class first extends Process {

	geeReducer(node) {
		return node.getArgument('ignore_nodata', true) ? 'firstNonNull' : 'first';
	}

	async execute(node, context) {
		throw "Not implemented yet.";
	}

};