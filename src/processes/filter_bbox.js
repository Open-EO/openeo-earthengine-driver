const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class filter_bbox extends Process {

	async execute(node, context, processGraph) {
		return Commons.filterBbox(node.getData("data"), node.getArgument("extent"), this.schema.id, 'extent');
	}

};