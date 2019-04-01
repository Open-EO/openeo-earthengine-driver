const Process = require('../processgraph/process');

module.exports = class filter_bands extends Process {

	async execute(node, context) {
		var dc = node.getData('imagery');
		var bands = node.getArgument('bands');
		dc.imageCollection(ic => ic.select(bands, bands));
		dc.dimBands().setValues(bands);
		return dc;
	}

};