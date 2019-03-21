const Utils = require('../utils');
const Process = require('../processgraph/process');

module.exports = class min_time extends Process {

	execute(args, context) {
		var obj = Utils.toImageCollection(args.imagery).reduce('min');
		return Promise.resolve(obj);
	}

};