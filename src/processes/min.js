const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class min extends Process {

	async execute(node, context) {
		return Commons.reduceInCallback(node, 'min');
	}

};