const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class variance extends BaseProcess {

	geeReducer() {
		return 'variance';
	}

	async execute(node) {
		throw "Not implemented yet.";
	}

};