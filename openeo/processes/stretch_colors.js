const eeUtils = require('../eeUtils');

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
	eeCode(args, req, res) {
		return eeUtils.toImage(args.imagery, req, res).visualize({
			min: args.min,
			max: args.max,
			palette: ['000000', 'FFFFFF']
		});
	}
};