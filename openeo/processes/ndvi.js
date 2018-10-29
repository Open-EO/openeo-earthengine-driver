const eeUtils = require('../eeUtils');

module.exports = {
	process_id: "NDVI",
	summary: "Calculates the Normalized Difference Vegetation Index.",
	description: "Calculates the Normalized Difference Vegetation Index.",
	parameters: {
		imagery: {
			description: "EO data to process.",
			required: true,
			schema: {
				type: "object",
				format: "eodata"
			}
		},
		red: {
			description: "Band id of the red band.",
			required: true,
			schema: {
				type: "string"
			}
		},
		nir: {
			description: "Band id of the near-infrared band.",
			required: true,
			schema: {
				type: "string"
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
		return eeUtils.toImageCollection(args.imagery).map((image) => {
			return image.normalizedDifference([args.nir, args.red]);
		});
	}
}