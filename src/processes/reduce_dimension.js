const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class reduce_dimension extends BaseProcess {

	async execute(node) {
		var dc = node.getDataCube("data");
		dc = await Commons.reduce(node, dc, this.id);
		// ToDo processes: We don't know at this point how the bands in the GEE images/imagecollections are called.
		var dimensionName = node.getArgument("dimension");
		dc.dropDimension(dimensionName);
		return dc;
	}

};