const ProcessUtils = require('../processUtils');

module.exports = {
	process_id: "first_time",
	description: "Returns the first element of a time series for all bands of the input dataset.",
	parameters: {
		imagery: {
			description: "EO data to process.",
			required: true,
			schema: {
				type: "object",
				format: "eodata"
			}
		},
		null: {
			description: "Defines whether the first element is allowed to be null (`true`, default) or not (`false`).",
			schema: {
				type: "boolean",
				default: true
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
		var obj = ProcessUtils.toImageCollection(args.imagery).reduce(args.null === true ? 'first' : 'firstNonNull');
		return Promise.resolve(obj);
	}
};