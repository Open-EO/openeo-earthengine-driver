const ProcessUtils = require('../processUtils');

module.exports = {
	process_id: "count_time",
	description: "Counts the number of images with a valid mask in a time series for all bands of the input dataset.",
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
		return ProcessUtils.validateSchema(this, req, args);
	},
	execute(req, args) {
		var obj = ProcessUtils.toImageCollection(args.imagery).reduce('count');
		return Promise.resolve(obj);
	}
};