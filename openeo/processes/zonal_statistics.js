const ProcessUtils = require('../processUtils');
const Utils = require('../utils');
const Errors = require('../errors');

module.exports = {
	process_id: "zonal_statistics",
	summary: "Calculates zonal statistics.",
	description: "Calculates statistics for each zone specified in a file.",
	parameters: {
		imagery: {
			description: "EO data to process.",
			required: true,
			schema: {
				type: "object",
				format: "eodata"
			}
		},
		regions: {
			description: "GeoJSON or a path to a GeoJSON file containing the regions. For paths you must specify the path to a user-uploaded file without the user id in the path.",
			required: true,
			schema: {
				type: [
					"object",
					"string"
				]
			}
		},
		func: {
			description: "Statistical function to calculate for the specified zones.",
			required: true,
			schema: {
				type: "string",
				enum: [
					"min",
					"max",
					"mean",
					"median",
					"mod"
				]
			}
		},
		scale: {
			description: "A nominal scale in meters of the projection to work in.",
			schema: {
				type: "number",
				default: 1000
			}
		},
		interval: {
			description: "Interval to group the time series.",
			schema: {
				type: "string",
				enum: [
					"day",
					"week",
					"month",
					"year"
				],
				default: "day"
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
		// ToDo: Further validation
		return ProcessUtils.validateSchema(this, args, req);
	},
	execute(req, args) {
		// Convert to an Image
		var imagery = ProcessUtils.toImageCollection(args.imagery);

		// Group the images by date
		imagery = this._groupImageCollectionByInterval(imagery, args.interval);

		// Read and parse GeoJSON file
		var p = null;
		if (typeof args.regions === 'string') {
			p = req.api.files.getFileContents(req.user._id, args.regions)
			.then(contents => JSON.parse(contents))
			.catch(err => {
				return Promise.reject(new Errors.ProcessArgumentInvalid({
					argument: 'regions',
					process: this.process_id,
					reason: err.message
				}));
			});
		}
		else if (typeof args.regions.type === 'string') { // Only a rough check for GeoJSON
			p = Promise.resolve(args.regions);
		}
		else {
			throw new Errors.ProcessArgumentInvalid({
				argument: 'regions',
				process: this.process_id,
				reason: 'Not a valid GeoJSON object.'
			});
		}

		return p.then(geojson => {
			// Convert GeoJSON to a GEE FeatureCollection
			var features = Utils.geoJsonToFeatureCollection(geojson);

			// Calculate the zonal statistics
			var results = this._calculateStatistics(imagery, features, args);

			// Transform results into the openEO format
			var data = {
				results: results.getInfo()
			};
			return Promise.resolve(data);
		});
	},

	_groupImageCollectionByInterval(imagery, interval) {
		interval = (interval == 'day' || interval == 'week' || interval == 'month' || interval == 'year') ? interval : 'day';
		var sortedImagery = imagery.sort('system:time_start').toList(imagery.size());
		var firstImage = ee.Image(sortedImagery.get(0));
		var start = ee.Date(firstImage.get('system:time_start'));
		var lastImage = ee.Image(sortedImagery.reverse().get(0));
		var end = ee.Date(lastImage.get('system:time_start'));
		var diff = end.difference(start, interval);
		var range = ee.List.sequence(0, diff.subtract(1)).map(day => start.advance(day, interval));
		var mosaics = (date, newlist) => {
			date = ee.Date(date);
			newlist = ee.List(newlist);
			var filtered = imagery.filterDate(date, date.advance(1, interval));
			var image = ee.Image(filtered.mosaic());
			image = image.set({date: date.format()});
			return ee.List(ee.Algorithms.If(filtered.size(), newlist.add(image), newlist));
		}
		return ee.ImageCollection(ee.List(range.iterate(mosaics, ee.List([]))));
	},

	_createReducerByName(name) {
		var reducer = null;
		switch(name) {
			case 'min':
				reducer = ee.Reducer.min();
				break;
			case 'max':
				reducer = ee.Reducer.max();
				break;
			case 'mean':
				reducer = ee.Reducer.mean();
				break;
			case 'median':
				reducer = ee.Reducer.median();
				break;
			case 'mode':
				reducer = ee.Reducer.mode();
				break;
		}
		return reducer;
	},

	_calculateStatistics(imagery, features, args) {
		var scale = args.scale ? args.scale : 1000;

		var reducer = this._createReducerByName(args.func);
		if (reducer === null) {
			throw new ProcessArgumentInvalid({
				argument: 'func',
				process: this.process_id,
				reason: 'Must be one of: min, max, mean, median or mode.'
			});
		}

		var multiRegionCalculator = function(image, list) {
			var result = image.reduceRegions({
				reducer: reducer,
				collection: features,
				scale: scale
			});
			// ToDo: Don't reduce, but create a result for each input feature individually
			var value = result.reduceColumns(reducer, ee.List([args.func])).get(args.func);
			return ee.List(list).add(ee.Dictionary({
				date: ee.Date(image.get('date')).format('y-MM-DD'),
				result: {
					// ToDo: Try to find a way to fill the missing values for valid/total number of pixels
					totalCount: null,
					validCount: null,
					value: value
				}
			}));
		};

		var data = ee.List([]);
		return imagery.iterate(multiRegionCalculator, data);
	}
};