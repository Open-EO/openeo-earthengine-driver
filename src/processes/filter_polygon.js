const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class filter_polygon extends BaseProcess {

	async execute(node) {
		return Commons.filterPolygons(node.getData("data"), node.getArgument("polygons"), this.schema.id, 'polygons');
	}

};