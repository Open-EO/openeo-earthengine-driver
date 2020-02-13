const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class divide extends BaseProcess {

	async execute(node) {
		return Commons.reduceInCallback(
			node,
			(a,b) => a / b,
			(a,b) => a.divide(b)
		);
	}

};