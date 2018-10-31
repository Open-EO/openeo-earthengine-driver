const ProcessUtils = require('../processUtils');

module.exports = {
	process_id: "median_time",
	description: "Calculates the median value of a time series for all bands of the input dataset.",
	parameters: {
		imagery: {
			description: "EO data to process.",
			required: true,
			schema: {
				type: "object",
				format: "eodata"
			}
		}
	},
	returns: {
		description: "Processed EO data.",
		schema: {
			type: "object",
			format: "eodata"
		}
	},
	validate(req, args) {
		return ProcessUtils.validateSchema(this, args, req);
	},
	execute(req, args) {
		var obj = ProcessUtils.toImageCollection(args.imagery).reduce('median');
		return Promise.resolve(obj);
	}
};