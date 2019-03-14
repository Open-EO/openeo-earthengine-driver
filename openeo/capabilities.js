const Utils = require('./utils');
const packageInfo = require('../package.json');

module.exports = class CapabilitiesAPI {

	constructor(config) {
		this.apiVersion = '0.4.0';
		this.endpoints = [];
	}

	beforeServerStart(server) {
		server.addEndpoint('get', '/.well-known/openeo', this.getVersions.bind(this), true);
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

	getVersions(req, res, next) {
		var versions = req.config.otherVersions.slice(0); // Make sure to clone it
		versions.push({
			url: Utils.getApiUrl(),
			production: !req.config.debug,
			version: req.config.apiVersion
		});
		res.json({
			versions: versions
		});
		return next();
	}

	getCapabilities(req, res, next) {
		res.json({
			api_version: this.apiVersion,
			backend_version: packageInfo.version,
			title: req.config.title,
			description: req.config.description,
			endpoints: this.endpoints,
			billing: {
				currency: req.config.currency,
				default_plan: req.config.plans.default,
				plans: req.config.plans.options
			},
			links: [
				{
					rel: 'about',
					href: 'https://earthengine.google.com/',
					title: 'Google Earth Engine Homepage'
				},
				{
					rel: 'related',
					href: 'https://github.com/Open-EO/openeo-earthengine-driver',
					title: 'GitHub repository'
				},
				{
					rel: 'version-history',
					href: Utils.getServerUrl() + '/.well-known/openeo',
					type: 'application/json',
					title: 'Supported API versions'
				}
			]
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