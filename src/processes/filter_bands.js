const Process = require('../processgraph/process');

module.exports = class filter_bands extends Process {

	execute(context, args) {
		var obj;
		// Select works on both images and image collections => no conversion applied.
		if (Array.isArray(args.bands)) {
			obj = args.imagery.select(args.bands, args.bands);
		}
		else {
			obj = args.imagery.select(args.bands);
		}
		return Promise.resolve(obj);
	}

};