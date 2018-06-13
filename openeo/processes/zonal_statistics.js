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
		let scale = args.scale ? args.scale : 1000;
		let imagery = args.imagery instanceof ee.Image ? args.imagery : args.imagery.mosaic();
	
		// Read and parse GeoJSON file
		let geojson = null;
		if (typeof args.regions === 'string') {
			let contents = Files.getFileContentsSync(req.user._id, args.regions);
			geojson = JSON.parse(contents);
		}
		else if (typeof args.regions.type === 'string') { // Only a rough check for GeoJSON
			geojson = args.regions;
		}
		else {
			throw 400;
		}

		// Convert GeoJSON to a GEE feature
		let feature = Utils.geoJsonToFeatures(geojson);

		// Get Reducer
		let reducer = this._createReducerByName(args.func);
		if (reducer === null) {
			throw 400;
		}

		var data = {
			results: []
		};
		let featureInfo = feature.getInfo();
		switch(featureInfo.type) {
			case 'FeatureCollection':
				var result = imagery.reduceRegions({
					reducer: reducer,
					collection: feature,
					scale: scale
				}).getInfo();
				var data = [];
				for(var i in result.features) {
					data.results.push({
						"geometry": result.features[i].geometry,
						"totalCount": null,
						"validCount": null,
						"value": feature.properties[args.func]
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
	},

	_createReducerByName(name) {
		let reducer = null;
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
};

module.exports = zonal_statistics;