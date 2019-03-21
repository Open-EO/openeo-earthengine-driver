const Utils = require('../utils');
const Process = require('../processgraph/process');

module.exports = class stretch_colors extends Process {

	execute(args, context) {
		var obj = Utils.toImage(args.imagery, req).visualize({
			min: args.min,
			max: args.max,
			palette: ['000000', 'FFFFFF']
		});
		return Promise.resolve(obj);
	}

};