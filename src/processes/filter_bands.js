const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class filter_bands extends BaseProcess {

	process(data, bands){
		return Commons.filterBands(data, bands);
	}

	async execute(node) {
		var dc = node.getData('data');
		var bands = node.getArgument('bands');
		return this.process(dc, bands);
	}

};