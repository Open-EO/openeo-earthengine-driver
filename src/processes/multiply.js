const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class multiply extends Process {

	async execute(node, context) {
		return Commons.reduceInCallback(
			node,
			(a,b) => a * b,
			(a,b) => a.multiply(b)
		);
	}

};