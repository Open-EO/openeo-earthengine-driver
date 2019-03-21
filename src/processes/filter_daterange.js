const Utils = require('../utils');
const Process = require('../processgraph/process');

module.exports = class filter_daterange extends Process {

	execute(args, context) {
		if (args.extent[0] === null) {
			args.extent[0] = "0000-01-01"; // Open date range: We just set the extent to the minimal start date here.
		}
		if (args.extent[1] === null) {
			args.extent[1] = Date.now(); // Open date range: The end date is set to the current date
		}
		var obj = Utils.toImageCollection(args.imagery).filterDate(args.extent[0], args.extent[1]);
		return Promise.resolve(obj);
	}

};