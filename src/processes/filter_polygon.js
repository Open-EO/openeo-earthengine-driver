const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class filter_polygon extends Process {

	async execute(node, context, processGraph) {
		return Commons.filterPolygons(node.getData("data"), node.getArgument("polygons"), this.schema.id, 'polygons');
	}

};