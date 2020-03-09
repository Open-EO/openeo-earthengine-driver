const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class subtract extends BaseProcess {

	async execute(node) {
		return Commons.reduceBinaryInCallback(
			node,
			(a,b) => a.subtract(b).copyProperties({source: a, properties: a.propertyNames()}),
			(a,b) => a - b
		);
	}

};