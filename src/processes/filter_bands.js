const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class filter_bands extends Process {

	process(data, bands){
		return Commons.filterBands(data, bands);
	}


	async execute(node, context) {
		var dc = node.getData('data');
		var bands = node.getArgument('bands');
		return this.process(dc, bands);
	}

};