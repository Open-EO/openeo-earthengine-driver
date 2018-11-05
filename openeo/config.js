const Utils = require('./utils');

module.exports = class Config {

	constructor() {
		// Set default that can be overriden by the config.json

		this.hostname = "127.0.0.1";
		this.apiPath = "/v0.3";
		this.apiVersion = "0.3.1";

		this.port = 80;
		this.ssl = {
			port: 443,
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

		let config = require('../config.json');
		for(var c in config) {
			this[c] = config[c];
		}
	}

	isValidOutputFormat(format) {
		return (typeof format === 'string' && Utils.isObject(this.outputFormats.options[format.toUpperCase()]));
	}

	isValidServiceType(service_type) {
		return (typeof service_type === 'string' && Utils.isObject(this.services[service_type.toLowerCase()]));
	}

}