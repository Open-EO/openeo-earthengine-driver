const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class last extends BaseProcess {

	geeReducer(node) {
		return node.getArgument('ignore_nodata', true) ? 'lastNonNull' : 'last';
	}

	async execute(node) {
		throw "Not implemented yet.";
	}

};