const axios = require('axios');
const Utils = require('./utils');

var Data = {

	cache: [],

	init() {
		var datasets = require('../storage/datasets.json');
		for(var i in datasets) {
			var data = datasets[i];
			var source = [];
			if (data.provider) {
				source.push(data.provider);
			}
			if (data.provider_url) {
				source.push(data.provider_url);
			}
			this.cache[data.id] = {
				product_id: data.id,
				description: data.title,
				source: source.join(', ')
			};
		}
		console.log("INFO: Added " + Utils.size(this.cache) + " datasets to cache.");
		return new Promise((resolve, reject) => resolve());
	},

	routes(server) {
		server.addEndpoint('get', '/data', this.getData.bind(this));
		server.addEndpoint('get', ['/data/{product_id}', '/data/:product_id(.*)'], this.getDataById.bind(this));
	},
	
	getData(req, res, next) {
		// Remove unused data
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
		console.log(req.params.product_id);
		var id = req.params.product_id;
		if (typeof this.cache[id] !== 'undefined') {
			var data = this.cache[id];
			if (typeof data.extent !== 'object') { // Allow caching
				this.gatherExtendedInfo(id);
			}
			res.json(data);
		}
		else {
			res.send(404);
		}
		return next();
	},

	gatherExtendedInfo(id) {
		var images = ee.ImageCollection(id);

		// Get date range
		var dates = images.get('date_range');
		if (Array.isArray(dates) && dates.length == 2) {
			this.cache[id].time = {
				from: Utils.toISODate(dates[0]),
				to: Utils.toISODate(dates[1])
			};
		}

		// Get bands (assuming all images contain the same bands)
		var metadata = images.first().getInfo();
		var bands = [];
		if (Array.isArray(metadata.bands)) {
			for(var i in metadata.bands) {
				var band = metadata.bands[i];
				bands.push({
					band_id: band.id
				});
			}
		}
		this.cache[id].bands = bands;

		// No extent information found, assume it is global...
		this.cache[id].extent = {
			srs: "EPSG:4326",
			left: -180,
			right: 180,
			bottom: -90,
			top: 90
		};

		console.log("INFO: Loaded additional data set information for '" + id + "'.");
	}

};

module.exports = Data;
