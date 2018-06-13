const zonal_statistics = require('./processes/zonal_statistics');

var ProcessRegistry = {
	
	processes: {},
	
	get(process_id) {
		var pid = process_id.toLowerCase();
		if (typeof ProcessRegistry.processes[pid] !== 'undefined') {
			return ProcessRegistry.processes[pid];
		}
		return null;
	},
	
	parseProcessGraph(req, obj, execute = true) {
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
				obj.args[a] = this.parseProcessGraph(req, obj.args[a], execute);
			}
			if (execute === true) {
				return process.eeCode(obj.args, req);
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

	zonal_statistics: zonal_statistics,

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
			return toImageCollection(args.imagery).map((image) => {
				return image.normalizedDifference([args.nir, args.red]);
			});
		}
	},

	filter_bands: {
		process_id: "filter_bands",
		description: "Selects certain bands from a collection.",
		args: {
			imagery: {
				description: "image or image collection"
			},
			bands: {
				description: "A single band id as string or multiple band ids as strings contained in an array."
			}
		},
		eeCode(args) {
			// Select works on both images and image collections => no conversion applied.
			return args.imagery.select(args.bands);
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

	count_time: {
		process_id: "count_time",
		description: "Counts the number of images with a valid mask in a time series for all bands of the input dataset.",
		args: {
			imagery: {
				description: "image or image collection"
			}
		},
		eeCode(args) {
			return toImageCollection(args.imagery).reduce('count');
		}
	},


	max_time: {
		process_id: "max_time",
		description: "Finds the maximum value of a time series for all bands of the input dataset.",
		args: {
			imagery: {
				description: "image or image collection"
			}
		},
		eeCode(args) {
			return toImageCollection(args.imagery).reduce('max');
		}
	},

	min_time: {
		process_id: "min_time",
		description: "Finds the minimum value of a time series for all bands of the input dataset.",
		args: {
			imagery: {
				description: "image or image collection"
			}
		},
		eeCode(args) {
			return toImageCollection(args.imagery).reduce('min');
		}
	},

	mean_time: {
		process_id: "mean_time",
		description: "Calculates the mean value of a time series for all bands of the input dataset.",
		args: {
			imagery: {
				description: "image or image collection"
			}
		},
		eeCode(args) {
			return toImageCollection(args.imagery).reduce('mean');
		}
	},

	median_time: {
		process_id: "median_time",
		description: "Calculates the median value of a time series for all bands of the input dataset.",
		args: {
			imagery: {
				description: "image or image collection"
			}
		},
		eeCode(args) {
			return toImageCollection(args.imagery).reduce('median');
		}
	},

	sum_time: {
		process_id: "sum_time",
		description: "Calculates the sum of a time series for all bands of the input dataset.",
		args: {
			imagery: {
				description: "image or image collection"
			}
		},
		eeCode(args) {
			return toImageCollection(args.imagery).reduce('sum');
		}
	},

	last_time: {
		process_id: "last_time",
		description: "Returns the last element of a time series for all bands of the input dataset.",
		args: {
			imagery: {
				description: "image or image collection"
			},
			null: {
				description: "Setting this argument to `true` will also include null inputs, otherwise returns the last of its non-null inputs.",
				default: false
			}
		},
		eeCode(args) {
			return toImageCollection(args.imagery).reduce(args.null === true ? 'last' : 'lastNonNull');
		}
	},

	first_time: {
		process_id: "first_time",
		description: "Returns the first element of a time series for all bands of the input dataset.",
		args: {
			imagery: {
				description: "image or image collection"
			},
			null: {
				description: "Setting this argument to `true` will also include null inputs, otherwise returns the last of its non-null inputs.",
				default: false
			}
		}, 
		eeCode(args) {
			return toImageCollection(args.imagery).reduce(args.null === true ? 'first' : 'firstNonNull');
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
		console.log("WARN: Compositing the image collection to a single image.");
		return obj.mosaic();
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