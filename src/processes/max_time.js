const Utils = require('../utils');
const Process = require('../processgraph/process');

module.exports = class max_time extends Process {

	execute(args, context) {
		var obj = Utils.toImageCollection(args.imagery).reduce('max');
		return Promise.resolve(obj);
	}

};