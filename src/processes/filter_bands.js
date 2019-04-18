const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class filter_bands extends Process {

	async execute(node, context) {
		var dc = node.getData('data');
		var bands = node.getArgument('bands');
		return Commons.filterBands(dc, bands);
	}

};