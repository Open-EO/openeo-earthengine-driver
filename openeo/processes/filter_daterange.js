const eeUtils = require('../eeUtils');

module.exports = {
	process_id: "filter_daterange",
	description: "Drops observations from a collection that have been captured before a start or after a given end date.",
	summary: "Filters by temporal extent.",
	description: "Filters by temporal extent.",
	parameters: {
		imagery: {
			description: "EO data to process.",
			required: true,
			schema: {
				type: "object",
				format: "eodata"
			}
		},
		extent: {
			description: "Temporal extent specified by a start and an end time, each formatted as a [RFC 3339](https://www.ietf.org/rfc/rfc3339) date-time. Open date ranges are supported and can be specified by setting one of the times to null. Setting both entries to null is not allowed.",
			schema: {
				type: "array",
				format: "temporal_extent",
				required: true,
				example: [
					"2016-01-01T00:00:00Z",
					"2017-10-01T00:00:00Z"
				],
				items: {
					type: [
						"string",
						"null"
					],
					format: "date-time",
					minItems: 2,
					maxItems: 2
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
		// ToDo: Check for null values
		return eeUtils.toImageCollection(args.imagery).filterDate(args.extent[0], args.extent[1]);
	}
};