const axios = require('axios');
const { size, toISODate } = require('./utils');

var dataCache = {};

function initData(cache) {
	dataCache = {
		'COPERNICUS/S2': {
			product_id: 'COPERNICUS/S2',
			description: "Sentinel-2 MSI: MultiSpectral Instrument, Level-1C",
			source: "European Union/ESA/Copernicus",
			extent: {
				srs: "EPSG:4326",
				left: -180,
				right: 180,
				bottom: -90,
				top: 90
			},
			time: {
				from: "2015-06-23",
				to: "2018-03-14"
			},
			bands: []
		}
	};
	return new Promise(function(resolve, reject) { resolve(); });

/*	var cachedData = cache.get("datasets");
	if (cachedData !== null && size(cachedData) > 0) {
		dataCache = cachedData;
		return new Promise(function(resolve, reject) {
			resolve();
		});
	}
	else {
		return Promise.all([
			loadDataByName("Copernicus"),
			loadDataByName("Landsat")
		]).then(() => {
			cache.set("datasets", dataCache, {life: 60*60*24});
			console.log("INFO: Added " + size(dataCache) + " datasets to cache.");
			return;
		});
	} */
}

function loadDataByName(name) {
	var options = {
		headers: {}
	};
	var authToken = ee.data.getAuthToken();
	if (goog.isDefAndNotNull(authToken)) {
		options.headers['Authorization'] = authToken;
	}
	return axios.get('https://code.earthengine.google.com/rasters', {q: name}, options)
		.then(function (res) {
			if (!Array.isArray(res.data.data)) {
				throw "Invalid response; no data found";
			}
			
			for(var i in res.data.data) {
				dataCache[res.data.data[i].id] = translateData(res.data.data[i]);
			}

			return res;
		})
		.catch(function (error) {
			throw "Could not load raster for '" + name + "' data from Google: " + error;
		});
}

function translateData(gData) {
	return {
		product_id: gData.id,
		description: gData.title,
		source: gData.provider,
		extent: { // Extent is unknown, this is placeholder data
			srs: "EPSG:4326",
			left: -180,
			right: 180,
			bottom: -90,
			top: 90
		},
		time: {
			from: toISODate(gData.date_range[0]),
			to: toISODate(gData.date_range[1])
		},
		bands: [] // Bands are in the description, maybe parse HTML?
	};
}

function getData(req, res, next) {
	var data = Object.values(dataCache).map(e => {
		delete e.time;
		delete e.bands;
		delete e.extent;
		return e;
	});
	res.json(data);
	return next();
}


function getDataById(req, res, next) {
	if (typeof dataCache[req.params.product_id] !== 'undefined') {
		res.json(dataCache[req.params.product_id]);
	}
	else {
		res.send(404);
	}
	return next();
}


module.exports = {
	initData,
	getData,
	getDataById
};
