const Utils = require('../utils');
const packageInfo = require('../../package.json');

module.exports = class CapabilitiesAPI {

	constructor(context) {
		this.apiVersion = '0.4.0';
		this.endpoints = [];
		this.context = context;
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
		var versions = this.context.otherVersions.slice(0); // Make sure to clone it
		versions.push({
			url: Utils.getApiUrl(),
			production: !this.context.debug,
			version: this.context.apiVersion
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
			title: this.context.title,
			description: this.context.description,
			endpoints: this.endpoints,
			billing: {
				currency: this.context.currency,
				default_plan: this.context.plans.default,
				plans: this.context.plans.options
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
		res.json(this.context.services);
		return next();
	}

	getOutputFormats(req, res, next) {
		res.json(this.context.outputFormats);
		return next();
	}
};