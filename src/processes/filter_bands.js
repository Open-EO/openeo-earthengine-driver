const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class filter_bands extends BaseProcess {

	process(data, bands, node){
		return Commons.filterBands(data, bands, node);
	}

	async execute(node) {
		var dc = node.getDataCube('data');
		var bands = node.getArgument('bands');
		return this.process(dc, bands, node);
	}

};