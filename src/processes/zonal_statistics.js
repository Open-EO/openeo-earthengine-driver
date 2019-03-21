const Utils = require('../utils');
const Errors = require('../errors');
const Process = require('../processgraph/process');

module.exports = class zonal_statistics extends Process {

	execute(args, context) {
		// Convert to an Image
		var imagery = Utils.toImageCollection(args.imagery);

		// Group the images by date
		imagery = this._groupImageCollectionByInterval(imagery, args.interval);

		// Read and parse GeoJSON file
		var p = null;
		if (typeof args.regions === 'string') {
			p = context.readFileFromWorkspace(args.regions)
			.then(contents => JSON.parse(contents))
			.catch(err => {
				// ToDo: Make such a check in validate.
				return Promise.reject(new Errors.ProcessArgumentInvalid({
					argument: 'regions',
					process: this.schema.id,
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
				process: this.schema.id,
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
	}

	_groupImageCollectionByInterval(imagery, interval) {
		interval = (interval == 'week' || interval == 'month' || interval == 'year') ? interval : 'day';
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
	}

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
	}

	_calculateStatistics(imagery, features, args) {
		var scale = args.scale ? args.scale : 1000;

		var reducer = this._createReducerByName(args.func);
		if (reducer === null) {
			throw new Errors.ProcessArgumentInvalid({
				argument: 'func',
				process: this.schema.id,
				reason: 'Must be one of: min, max, mean, median or mode.'
			});
		}

		var multiRegionCalculator = function(image, dict) {
			var results = image.reduceRegions({
				reducer: reducer,
				collection: features,
				scale: scale
			});
			var values = results.aggregate_array(args.func);
			var date = ee.Date(image.get('date')).format('y-MM-dd'); // Would it be enough to call image.get('date')?
			return ee.Dictionary(dict).set(date, values);
		};

		var data = ee.Dictionary({});
		return imagery.iterate(multiRegionCalculator, data);
	}
};