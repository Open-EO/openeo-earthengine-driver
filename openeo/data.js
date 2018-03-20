const axios = require('axios');
const Utils = require('./utils');

var Data = {

	cache: null,

	init() {
		this.cache = {
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
		console.log("INFO: Data sets loaded.");
		return new Promise((resolve, reject) => resolve());
	
	/*	return Promise.all([
			this.loadDataByName("Copernicus"),
			this.loadDataByName("Landsat")
		]).then(data => {
			console.log("INFO: Added " + Utils.size(this.cache) + " datasets to cache.");
			return data;
		}); */

	},

	routes(server) {
		server.addEndpoint('get', '/data', this.getData.bind(this));
		server.addEndpoint('get', '/data/{product_id}', this.getDataById.bind(this));
	},

	loadDataByName(name) {
		var options = {
			headers: {}
		};
		var authToken = ee.data.getAuthToken();
		if (goog.isDefAndNotNull(authToken)) {
			options.headers['Authorization'] = authToken;
		}
		return axios.get('https://code.earthengine.google.com/rasters', {q: name}, options)
			.then((res) => {
				if (!Array.isArray(res.data.data)) {
					throw "Invalid response; no data found";
				}
				
				for(var i in res.data.data) {
					this.cache[res.data.data[i].id] = this.translateData(res.data.data[i]);
				}
	
				return res;
			})
			.catch((error) => {
				throw "Could not load raster for '" + name + "' data from Google: " + error;
			});
	},
	
	translateData(gData) {
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
				from: Utils.toISODate(gData.date_range[0]),
				to: Utils.toISODate(gData.date_range[1])
			},
			bands: [] // Bands are in the description, maybe parse HTML?
		};
	},
	
	getData(req, res, next) {
		var data = Object.values(this.cache).map(e => {
			return {
				product_id: e.product_id,
				description: e.description,
				source: e.source
			};
		});
		res.json(data);
		return next();
	},
	
	
	getDataById(req, res, next) {
		if (typeof this.cache[req.params.product_id] !== 'undefined') {
			res.json(this.cache[req.params.product_id]);
		}
		else {
			res.send(404);
		}
		return next();
	}

};

module.exports = Data;
