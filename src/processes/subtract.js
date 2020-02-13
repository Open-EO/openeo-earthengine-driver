const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class subtract extends BaseProcess {

	async execute(node) {
		return Commons.reduceInCallback(
			node,
			(a,b) => a - b,
			(a,b) => a.subtract(b)
		);
	}

};