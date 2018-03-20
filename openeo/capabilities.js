var Capabilities = {

	outputFormats: {
		PNG: {},
		JPEG: {}
	},

	services: {
		xyz: {}
	},

	endpoints: [],

	init() {
		return new Promise((resolve, reject) => resolve());
	},

	routes(server) {
		server.addEndpoint('get', '/capabilities', this.getCapabilities.bind(this));
		server.addEndpoint('get', '/capabilities/services', this.getServices.bind(this));
		server.addEndpoint('get', '/capabilities/output_formats', this.getOutputFormats.bind(this));
	},

	addEndpoint(method, path) {
		this.endpoints.push(path);
	},

	getCapabilities(req, res, next) {
		res.json(this.endpoints);
		return next();
	},

	getServices(req, res, next) {
		res.json(Object.keys(this.services));
		return next();
	},

	isValidOutputFormat(format) {
		return (typeof this.outputFormats[format.toUpperCase()] === 'object') ? true : false;
	},

	isValidServiceType(service_type) {
		return (typeof this.services[service_type.toLowerCase()] === 'object') ? true : false;
	},

	getDefaultOutputFormat() {
		return "JPEG";
	},

	translateOutputFormat(format) {
		format = format.toLowerCase();
		switch(format) {
			case 'jpeg':
				return 'jpg';
			default:
				return format;
		}
	},

	getOutputFormats(req, res, next) {

		res.json({
			default: this.getDefaultOutputFormat(),
			formats: this.outputFormats
		});
		return next();
	}
};

module.exports = Capabilities;

