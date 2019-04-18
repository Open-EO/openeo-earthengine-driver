const Process = require('../processgraph/process');

module.exports = class filter_temporal extends Process {

	async execute(node, context) {
		return Commons.filterTemporal(node.getData("data"), node.getArgument("extent"));
	}

};