var ProcessRegistry = {
	
	processes: {},
	
	get(process_id) {
		var pid = process_id.toLowerCase();
		if (typeof ProcessRegistry.processes[pid] !== 'undefined') {
			return ProcessRegistry.processes[pid];
		}
		return null;
	},
	
	parseProcessGraph(obj, execute = true) {
		if (obj.hasOwnProperty("product_id")) { // Image Collection
			// ToDo: Check whether product exists
			if (execute === true) {
				return ee.ImageCollection(obj.product_id);
			}
			else {
				return obj;
			}
		}
		else if(obj.hasOwnProperty("process_id")) { // Process
			var process = this.get(obj.process_id);
			if (process === null) {
				throw "Process '" + obj.process_id + "' is not supported.";
			}
			for(var a in obj.args) {
				obj.args[a] = this.parseProcessGraph(obj.args[a], execute);
			}
			if (execute === true) {
				return process.eeCode(obj.args);
			}
			else {
				return obj;
			}
		}
		else if (obj === null || typeof obj === 'boolean' || Array.isArray(obj) || typeof obj === 'number' || typeof obj === 'string') {
			// ToDO: Check if array is valid
			// ToDo: Doesn't support process collections, must go through array for that
			return obj;
		}
		else {
			throw "Invalid argument type: " + typeof obj;
		}
	},

	toImage: toImage,
	toImageCollection: toImageCollection

};

ProcessRegistry.processes = {
	// Key must be lowercase!
	ndvi: {
		process_id: "NDVI",
		description: "Finds the minimum value of time series for all bands of the input dataset.",
		args: {
			imagery: {
				description: "image or image collection"
			},
			red: {
				description: "reference to the red band"
			},
			nir: {
				description: "reference to the nir band"
			}
		},
		eeCode(args) {
			return toImageCollection(args.imagery).map(function(image) {
				return image.normalizedDifference([args.nir, args.red]);
			});
		}
	},

	filter_bbox: {
		process_id: "filter_bbox",
		description: "Drops observations from a collection that are located outside of a given bounding box.",
		args: {
			imagery: {
				description: "image or image collection"
			},
			left: {
				description: "left boundary (longitude / easting)"
			},
			right: {
				description: "right boundary (longitude / easting)"
			},
			top: {
				description: "top boundary (latitude / northing)"
			},
			bottom: {
				description: "bottom boundary (latitude / northing)"
			},
			srs: {
				description: "spatial reference system of boundaries as proj4 or EPSG:12345 like string"
			}
		},
		eeCode(args) {
			var xMin = Math.min(args.left, args.right);
			var xMax = Math.max(args.left, args.right);
			var yMin = Math.min(args.bottom, args.top);
			var yMax = Math.max(args.bottom, args.top);
			var geom = ee.Geometry.Rectangle([xMin, yMin, xMax, yMax], args.srs);
			global.downloadRegion = geom;
			return toImageCollection(args.imagery).filterBounds(geom);
		}
	},

	filter_daterange: {
		process_id: "filter_daterange",
		description: "Drops observations from a collection that have been captured before a start or after a given end date.",
		args: {
			imagery: {
				description: "image or image collection"
			},
			from: {
				description: "start date"
			},
			to: {
				description: "end date"
			}
		},
		eeCode(args) {
			return toImageCollection(args.imagery).filterDate(args.from, args.to);
		}
	},

	min_time: {
		process_id: "min_time",
		description: "Finds the minimum value of time series for all bands of the input dataset.",
		args: {
			imagery: {
				description: "image or image collection"
			}
		},
		eeCode(args) {
			return toImageCollection(args.imagery).min();
		}
	},

	stretch_colors: {
		process_id: "stretch_colors",
		description: "Color stretching",
		args: {
			imagery: {
				description: "image or image collection"
			},
			min: {
				description: "minimum value"
			},
			max: {
				description: "maximum value"
			}
		},
		eeCode(args) {
			return toImage(args.imagery).visualize({
				min: args.min,
				max: args.max,
				palette: ['000000', 'FFFFFF']
			});
		}
	}

};

function toImage(obj) {
	if (obj instanceof ee.Image) {
		return obj;
	}
	else if (obj instanceof ee.ImageCollection) {
		console.log("WARN: Reducing image collection to the first image");
		return ee.Image(obj.first());
	}
	return null;
}

function toImageCollection(obj) {
	if (obj instanceof ee.ImageCollection) {
		return obj;
	}
	else if (obj instanceof ee.Image) {
		return ee.ImageCollection(obj);
	}
	return null;
}

module.exports = ProcessRegistry;