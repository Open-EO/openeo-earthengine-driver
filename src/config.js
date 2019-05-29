module.exports = class Config {

	constructor() {
		// Set default that can be overriden by the config.json
		this.debug = false;

		this.hostname = "127.0.0.1";
		this.apiPath = "/";
		this.apiVersion = "0.4.1";

		this.title = "Google Earth Engine";
		this.description = "This is the Google Earth Engine Driver for openEO.";

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
			PNG: {
				gis_data_types: ['raster']
			},
			JPEG: {
				gis_data_types: ['raster']
			},
			JSON: {
				gis_data_types: ['raster', 'vector', 'table', 'other']
			}
		};

		this.services = {
			xyz: {}
		};

		this.otherVersions = [];
		// Example to add: {url: 'http://xyz.de', production: false, version: '1.0.0'}

		let config = require('../config.json');
		for(var c in config) {
			this[c] = config[c];
		}

		this.ssl.exposePort = this.ssl.exposePort || this.ssl.port;
		this.exposePort = this.exposePort || this.port;
	}

}