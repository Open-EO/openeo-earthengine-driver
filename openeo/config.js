const Utils = require('./utils');

module.exports = class Config {

	constructor() {
		// Set default that can be overriden by the config.json
		this.debug = false;

		this.hostname = "127.0.0.1";
		this.apiPath = "/";
		this.apiVersion = "0.4.0";

		this.port = 80;
		this.exposePort = null;
		this.ssl = {
			port: 443,
			exposePort: null,
			key: null,
			certificate: null 
		};

		this.serviceAccountCredentialsFile = "privatekey.json";

		this.currency = null;
		this.plans = {
			default: null,
			options: []
		};

		this.outputFormats = {
			default: "PNG",
			options: {
				PNG: {
					gis_data_types: ['raster']
				},
				JPEG: {
					gis_data_types: ['raster']
				},
				JSON: {
					gis_data_types: ['raster', 'vector', 'table', 'other']
				}
			}
		};

		this.services = {
			xyz: {}
		};

		this.processes = [
			'count_time',
			'filter_bands',
			'filter_bbox',
			'filter_daterange',
			'first_time',
			'get_collection',
			'last_time',
			'max_time',
			'mean_time',
			'median_time',
			'min_time',
			'ndvi',
			'process_graph',
			'stretch_colors',
			'sum_time',
			'zonal_statistics'
		];

		this.otherVersions = [];
		// Example to add: {url: 'http://xyz.de', production: false, version: '1.0.0'}

		let config = require('../config.json');
		for(var c in config) {
			this[c] = config[c];
		}

		this.ssl.exposePort = this.ssl.exposePort || this.ssl.port;
		this.exposePort = this.exposePort || this.port;
	}

	isValidOutputFormat(format) {
		return (typeof format === 'string' && Utils.isObject(this.outputFormats.options[format.toUpperCase()]));
	}

	isValidServiceType(service_type) {
		return (typeof service_type === 'string' && Utils.isObject(this.services[service_type.toLowerCase()]));
	}

}