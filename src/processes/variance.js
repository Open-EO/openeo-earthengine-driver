const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class variance extends BaseProcess {
// ToDo 1.0.0 ignore_nodata parameter
	geeReducer() {
		return 'variance';
	}

	async execute(node) {
		throw "Not implemented yet.";
	}

};