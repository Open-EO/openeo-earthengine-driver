import Utils from "./utils.js";

export default class Config {

	constructor() {
		// Set default that can be overriden by the config.json
		this.debug = false;
		this.production = false;

		this.hostname = "127.0.0.1";
		this.apiPath = "/";
		this.apiVersion = "1.2.0";

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

		this.serviceAccountCredentialsFile = null;
		this.googleAuthClients = [];

		this.currency = null;
		this.plans = {
			default: null,
			options: []
		};

		const sizeOption = {
			type: 'integer',
			description: 'The size for the longest side the image, in pixels.',
			default: 1000,
			minimum: 1,
			maximum: 2000
		};
		const visOptions = {
			red: {
				type: 'string',
				subtype: 'band-name', // The formats are not specification compliant, but are allowed to be added.
				description: 'Band name being used for the red channel.',
				default: null
			},
			green: {
				type: 'string',
				subtype: 'band-name',
				description: 'Band name being used for the green channel.',
				default: null
			},
			blue: {
				type: 'string',
				subtype: 'band-name',
				description: 'Band name being used for the blue channel.',
				default: null
			},
			gray: {
				type: 'string',
				subtype: 'band-name',
				description: 'Band name being used as a gray channel.',
				default: null
			},
			palette: {
				type: 'array',
				description: 'List of hex RGB colors used as palette for visualization, e.g. `#ffffff` for white.',
				default: null
			},
			size: sizeOption,
			epsgCode: {
				type: 'integer',
				subtype: 'epsg-code', // The formats are not specification compliant, but are allowed to be added.
				description: 'EPSG Code to reproject the images to. Defaults to WGS 84 (EPSG Code 4326).',
				default: 4326
			}
		};

		this.inputFormats = {};
		this.outputFormats = {
			PNG: {
				title: 'PNG',
				gis_data_types: ['raster'],
				parameters: visOptions
			},
			JPEG: {
				title: 'JPG / JPEG',
				gis_data_types: ['raster'],
				parameters: visOptions
			},
			"GTIFF-THUMB": {
				title: 'GeoTiff (thumbnail)',
				gis_data_types: ['raster'],
				parameters: {
					size: sizeOption,
					epsgCode: {
						type: 'integer',
						subtype: 'epsg-code', // The subtype is not specification compliant, but is allowed to be added.
						description: 'EPSG Code to reproject the images to. Defaults to native CRS.',
						default: null
					}
				}
			},
			"GTIFF-ZIP": {
				title: 'GeoTiff (zipped)',
				gis_data_types: ['raster'],
				parameters: {
					size: sizeOption,
					epsgCode: {
						type: 'integer',
						subtype: 'epsg-code', // The subtype is not specification compliant, but is allowed to be added.
						description: 'EPSG Code to reproject the images to. Defaults to native CRS.',
						default: null
					}
				}
			},
			JSON: {
				title: 'JSON',
				gis_data_types: ['raster', 'vector', 'table', 'other'],
				parameters: {}
			}
		};

		this.services = {
			xyz: {
				title: "XYZ (Slippy Map Tilenames)",
				description: "XYZ tiles for web mapping libraries such as OpenLayers or LeafLet.\n\nAlways rendered in Web Mercator (EPSG code 3857), other reference systems specified are ignored.",
				configuration: {},
				process_parameters: []
			}
		};

		this.otherVersions = [];
		// Example to add: {url: 'http://xyz.de', production: false, version: '1.0.0'}

		// Path to check disk usage for (e.g. C: on Windows, / on *nix)
		this.diskUsagePath = null;

		const config = Utils.require('../../config.json');
		for(const c in config) {
			this[c] = config[c];
		}

		this.ssl.exposePort = this.ssl.exposePort || this.ssl.port;
		this.exposePort = this.exposePort || this.port;
	}

}
