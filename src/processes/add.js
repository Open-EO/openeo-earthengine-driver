const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class multiply extends BaseProcess {

	// ToDo: 1.0.0: new multiply definition (this is currently the process "product")
	async execute(node) {
		return Commons.reduceBinaryInCallback(
			node,
			(a,b) => a + b,
			(a,b) => a.add(b)
		);
	}

};