module.exports = {
	process_id: "filter_bands",
		summary: "Filters by bands.",
		description: "Allows to extract one or multiple bands of multi-band raster image collection.\nBands can be chosen either by band id.",
		parameters: {
			imagery: {
				description: "EO data to process.",
				required: true,
				schema: {
					type: "object",
					format: "eodata"
				}
			},
			bands: {
				description: "string or array of strings containing band ids.",
				required: true,
				schema: {
					type: [
						"string",
						"array"
					],
					items: {
						type: "string"
					}
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
		// Select works on both images and image collections => no conversion applied.
		if (Array.isArray(args.bands)) {
			return args.imagery.select(args.bands, args.bands);
		}
		else {
			return args.imagery.select(args.bands);
		}
	}
};