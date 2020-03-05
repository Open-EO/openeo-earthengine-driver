const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class filter_temporal extends BaseProcess {

	async execute(node) {
		return Commons.filterTemporal(node.getDataCube("data"), node.getArgument("extent"), node.getArgument("dimension"));
	}

};