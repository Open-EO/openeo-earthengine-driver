module.exports = class CapabilitiesAPI {

	constructor(config) {
		this.apiVersion = '0.4.0';
		this.endpoints = [];
	}

	beforeServerStart(server) {
		server.addEndpoint('get', '/', this.getCapabilities.bind(this));
		server.addEndpoint('get', '/service_types', this.getServices.bind(this));
		server.addEndpoint('get', '/output_formats', this.getOutputFormats.bind(this));

		return Promise.resolve();
	}

	addEndpoint(method, path) {
		method = method.toUpperCase();
		for(let i in this.endpoints) {
			if (this.endpoints[i].path == path) {
				this.endpoints[i].methods.push(method);
				return;
			}
		}
		this.endpoints.push({
			path: path,
			methods: [method]
		});
	}

	getCapabilities(req, res, next) {
		res.json({
			version: this.apiVersion,
			endpoints: this.endpoints,
			billing: {
				currency: req.config.currency,
				default_plan: req.config.plans.default,
				plans: req.config.plans.options
			}
		});
		return next();
	}

	getServices(req, res, next) {
		res.json(req.config.services);
		return next();
	}

	getOutputFormats(req, res, next) {
		res.json({
			default: req.config.outputFormats.default,
			formats: req.config.outputFormats.options
		});
		return next();
	}
};