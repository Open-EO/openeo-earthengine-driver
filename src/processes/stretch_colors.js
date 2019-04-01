const Utils = require('../utils');
const Process = require('../processgraph/process');

module.exports = class stretch_colors extends Process {

	async execute(node, context) {
		var dc = node.getData("imagery");
		dc.image(img => img.visualize({
			min: node.getArgument("min"),
			max: node.getArgument("max"),
			palette: ['000000', 'FFFFFF']
		}));
		return dc;
	}

};