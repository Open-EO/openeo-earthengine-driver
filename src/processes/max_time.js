const Utils = require('../utils');
const Process = require('../processgraph/process');

module.exports = class max_time extends Process {

	async execute(node, context) {
		var dc = node.getData("imagery");
		dc.imageCollection(ic => ic.reduce('max'));
		return dc;
	}

};