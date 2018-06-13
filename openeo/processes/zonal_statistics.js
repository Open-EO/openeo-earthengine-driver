const Files = require('../files');
const Utils = require('../utils');

var zonal_statistics = {
	process_id: "zonal_statistics",
	description: "Calculates statistics for each zone specified in a file.",
	args: {
		imagery: {
			description: "image or image collection"
		},
		regions: {
			description: "GeoJSON file containing polygons. Must specify the path to a user-uploaded file without the user id in the path."
		},
		func: {
			description: "Statistical function to calculate for the specified zones. Allowed values: min, max, mean, median, mode"
		},
		scale: {
			description: "A nominal scale in meters of the projection to work in. Defaults to 1000."
		}
	},
	eeCode(args, req) {
		// Convert to an Image
		var imagery = args.imagery instanceof ee.Image ? args.imagery : args.imagery.mosaic();
	
		// Read and parse GeoJSON file
		var geojson = null;
		if (typeof args.regions === 'string') {
			var contents = Files.getFileContentsSync(req.user._id, args.regions);
			geojson = JSON.parse(contents);
		}
		else if (typeof args.regions.type === 'string') { // Only a rough check for GeoJSON
			geojson = args.regions;
		}
		else {
			throw 400;
		}

		// Convert GeoJSON to a GEE feature
		var feature = Utils.geoJsonToFeatures(geojson);

		// Calculate the zonal statistics
		return this._calculateStatistics(imagery, feature, args);
	},

	_groupImageCollectionByDate(imagery) {
		var sortedImagery = imagery.sort('system:time_start').toList(imagery.size());
		var firstImage = ee.Image(sortedImagery.get(0));
		var start = ee.Date(firstImage.get('system:time_start'));
		var lastImage = ee.Image(sortedImagery.reverse().get(0));
		var end = ee.Date(lastImage.get('system:time_start'));
		var diff = end.difference(start, 'day');
		var range = ee.List.sequence(0, diff.subtract(1)).map(day => { return start.advance(day, 'day'); });
		var day_mosaics = (date, newlist) => {
			date = ee.Date(date);
			newlist = ee.List(newlist);
			var filtered = imagery.filterDate(date, date.advance(1, 'day'));
			var image = ee.Image(filtered.mosaic());
			image = image.set({date: date.format()});
			return ee.List(ee.Algorithms.If(filtered.size(), newlist.add(image), newlist));
		}
		return ee.ImageCollection(ee.List(range.iterate(day_mosaics, ee.List([]))));
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

	_calculateStatistics(imagery, feature, args) {
		var scale = args.scale ? args.scale : 1000;

		var reducer = this._createReducerByName(args.func);
		if (reducer === null) {
			throw 400;
		}

		var data = {
			results: []
		};
		var featureInfo = feature.getInfo();
		switch(featureInfo.type) {
			case 'FeatureCollection':
				var result = imagery.reduceRegions({
					reducer: reducer,
					collection: feature,
					scale: scale
				}).getInfo();
				for(var i in result.features) {
					data.results.push({
						"geometry": result.features[i].geometry,
						"totalCount": null,
						"validCount": null,
						"value": result.features[i].properties[args.func]
					});
				}
				break;
			case 'Feature':
				var bands = imagery.bandNames().getInfo();
				var result = imagery.reduceRegion({
					reducer: reducer,
					geometry: feature.geometry(),
					scale: scale
				}).getInfo();
				for(var i in bands) {
					if (result[bands[i]]) {
						data.results.push({
							"band": bands[i],
							"totalCount": null,
							"validCount": null,
							"value": result[bands[i]]
						});
					}
				}
				break;
			default:
				throw 500;
		}
		return data;

	}
};

module.exports = zonal_statistics;