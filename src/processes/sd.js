const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class sd extends BaseProcess {

	geeReducer() {
		return 'stdDev';
	}

	async execute(node) {
		throw "Not implemented yet.";
	}

};