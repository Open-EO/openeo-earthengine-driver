const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class divide extends BaseProcess {

	//TODO: Introducing DivisionByZero error
	async execute(node) {
		return Commons.reduceBinaryInCallback(
			node,
			(a,b) => a / b,
			(a,b) => a.divide(b)
		);
	}

};