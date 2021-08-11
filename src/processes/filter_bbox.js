const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class filter_bbox extends BaseProcess {

	async execute(node) {
		return Commons.filterBbox(node.getDataCube("data"), node.getArgument("extent"), this.id, 'extent');
	}

};