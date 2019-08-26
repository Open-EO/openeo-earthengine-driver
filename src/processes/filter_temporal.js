const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class filter_temporal extends Process {

	async execute(node, context) {
		return Commons.filterTemporal(node.getData("data"), node.getArgument("extent"));
	}

};