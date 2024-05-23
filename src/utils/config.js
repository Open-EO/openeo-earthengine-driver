import GTiffFormat from "../formats/gtiff.js";
import JpegFormat from "../formats/jpeg.js";
import JsonFormat from "../formats/json.js";
import PngFormat from "../formats/png.js";
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


		this.inputFormats = {};
		this.outputFormats = {
			PNG: new PngFormat(),
			JPEG: new JpegFormat(),
			GTIFF: new GTiffFormat(),
			JSON: new JsonFormat()
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

		this.defaultLogLevel = "info";
		this.stacAssetDownload = false;

		const config = Utils.require('../../config.json');
		for(const c in config) {
			this[c] = config[c];
		}

		this.ssl.exposePort = this.ssl.exposePort || this.ssl.port;
		this.exposePort = this.exposePort || this.port;
	}

}
