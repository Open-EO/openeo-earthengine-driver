const ProcessUtils = require('../processUtils');

module.exports = {
	process_id: "stretch_colors",
	description: "Color stretching",
	parameters: {
		imagery: {
			description: "EO data to process.",
			required: true,
			schema: {
				type: "object",
				format: "eodata"
			}
		},
		min: {
			description: "Minimum value",
			required: true,
			schema: {
				type: "number"
			}
		},
		max: {
			description: "Maximum value",
			required: true,
			schema: {
				type: "number"
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
		var obj = ProcessUtils.toImage(args.imagery, req).visualize({
			min: args.min,
			max: args.max,
			palette: ['000000', 'FFFFFF']
		});
		return Promise.resolve(obj);
	}
};