const Utils = require('../utils');
const packageInfo = require('../../package.json');

module.exports = class CapabilitiesAPI {

	constructor(context) {
		this.endpoints = [];
		this.context = context;
	}

	beforeServerStart(server) {
		server.addEndpoint('get', '/', this.getRoot.bind(this), false, true);
		server.addEndpoint('get', '/.well-known/openeo', this.getVersions.bind(this), false, true);
		server.addEndpoint('get', '/', this.getCapabilities.bind(this));
		server.addEndpoint('get', '/conformance', this.getConformance.bind(this));
		server.addEndpoint('get', '/service_types', this.getServices.bind(this));
		server.addEndpoint('get', '/file_formats', this.getFileFormats.bind(this));

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

	getRoot(req, res, next) {
		res.redirect('/.well-known/openeo', next);
	}

	getVersions(req, res, next) {
		var versions = this.context.otherVersions.slice(0); // Make sure to clone it
		versions.push({
			url: Utils.getApiUrl(),
			production: this.context.production,
			api_version: this.context.apiVersion
		});
		res.json({
			versions: versions
		});
		return next();
	}

	getCapabilities(req, res, next) {
		res.json({
			api_version: this.context.apiVersion,
			backend_version: packageInfo.version,
			stac_version: packageInfo.stac_version,
			type: "Catalog",
			production: this.context.production,
			id: this.context.id,
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
					rel: 'terms-of-service',
					href: 'https://earthengine.google.com/terms/',
					type: 'text/html',
					title: 'Google Earth Engine Terms of Service'
				},
				{
					rel: 'privacy-policy',
					href: 'https://policies.google.com/privacy',
					type: 'text/html',
					title: 'Google Privacy Policy'
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
				},
				{
					rel: "data",
					href: Utils.getApiUrl("/collections"),
					type: "application/json",
					title: "Datasets"
				},
				{
					rel: "conformance",
					href: Utils.getApiUrl("/conformance"),
					type: "application/json",
					title: "OGC Conformance classes"
				}
			]
		});
		return next();
	}

	getConformance(req, res, next) {
		res.json({
			"conformsTo": [
				"http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core"
			]
		});
		return next();
	}

	getServices(req, res, next) {
		res.json(this.context.services);
		return next();
	}

	getFileFormats(req, res, next) {
		res.json({
			input: this.context.inputFormats,
			output: this.context.outputFormats
		});
		return next();
	}
};