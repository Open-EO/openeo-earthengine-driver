module.exports = class Config {

	constructor() {
		// Set default that can be overriden by the config.json
		this.debug = false;
		this.production = false;

		this.hostname = "127.0.0.1";
		this.apiPath = "/";
		this.apiVersion = "1.0.0-rc.2";

		this.id = "openeo-earthengine-driver";
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

		this.inputFormats = {};
		this.outputFormats = {
			PNG: {
				title: 'PNG',
				gis_data_types: ['raster'],
				parameters: {
					red: {
						type: 'string',
						format: 'band-name', // The formats are not specification compliant, but are allowed to be added.
						description: 'Band name being used for the red channel.',
						default: null
					},
					green: {
						type: 'string',
						format: 'band-name',
						description: 'Band name being used for the green channel.',
						default: null
					},
					blue: {
						type: 'string',
						format: 'band-name',
						description: 'Band name being used for the blue channel.',
						default: null
					},
					gray: {
						type: 'string',
						format: 'band-name',
						description: 'Band name being used as a gray channel.',
						default: null
					},
				}
			},
			JPEG: {
				title: 'JPG / JPEG',
				gis_data_types: ['raster'],
				parameters: {
					red: {
						type: 'string',
						format: 'band-name', // The formats are not specification compliant, but are allowed to be added.
						description: 'Band name being used for the red channel.',
						default: null
					},
					green: {
						type: 'string',
						format: 'band-name',
						description: 'Band name being used for the green channel.',
						default: null
					},
					blue: {
						type: 'string',
						format: 'band-name',
						description: 'Band name being used for the blue channel.',
						default: null
					},
					gray: {
						type: 'string',
						format: 'band-name',
						description: 'Band name being used as a gray channel.',
						default: null
					},
				}
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

		// Path to check disk usage for (e.g. C: on Windows, / on *nix)
		this.diskUsagePath = null;

		let config = require('../config.json');
		for(var c in config) {
			this[c] = config[c];
		}

		this.ssl.exposePort = this.ssl.exposePort || this.ssl.port;
		this.exposePort = this.exposePort || this.port;
	}

}