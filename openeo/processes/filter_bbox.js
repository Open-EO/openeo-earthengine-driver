const ProcessUtils = require('../processUtils');
const Errors = require('../errors');

module.exports = {
	process_id: "filter_bbox",
	description: "Drops observations from a collection that are located outside of a given bounding box.",
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
			description: "Spatial extent, may include a vertical axis (height or depth).",
			schema: {
				type: "object",
				format: "spatial_extent",
				required: [
					"west",
					"east",
					"north",
					"south"
				],
				properties: {
					crs: {
						description: "Coordinate reference system. EPSG codes must be supported. In addition, proj4 strings should be supported by back-ends. Whenever possible, it is recommended to use EPSG codes instead of proj4 strings.\nDefaults to `EPSG:4326` unless the client explicitly requests a different coordinate reference system.",
						type: "string",
						default: "EPSG:4326"
					},
					west: {
						description: "Lower left corner, coordinate axis 1 (west).",
						type: "number"
					},
					east: {
						description: "Upper right corner, coordinate axis 1 (east).",
						type: "number"
					},
					north: {
						description: "Lower left corner, coordinate axis 2 (north).",
						type: "number"
					},
					south: {
						description: "Upper right corner, coordinate axis 2 (south).",
						type: "number"
					}
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
	exceptions: {
		ProcessArgumentUnsupported: {
			description: "The height or base parameters are set, but not supported."
		}
	},
	validate(req, args) {
		// ToDo: Further validation
		return ProcessUtils.validateSchema(this, args, req);
	},
	execute(req, args) {
		var geom;
		try {
			geom = ee.Geometry.Rectangle([args.extent.west, args.extent.south, args.extent.east, args.extent.north], args.extent.crs);
			global.downloadRegion = geom;
		} catch (e) {
			return Promise.reject(new Errors.ProcessArgumentInvalid({
				process: this.process_id,
				argument: 'extent',
				reason: e.message
			}));
		}
		try {
			var obj = ProcessUtils.toImageCollection(args.imagery).filterBounds(geom);
			return Promise.resolve(obj);
		} catch (e) {
			return Promise.reject(new Errors.EarthEngineError(e, {process: this.process_id}));
		}
	}
};