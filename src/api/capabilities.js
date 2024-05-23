import Utils from '../utils/utils.js';
const packageInfo = Utils.require('../../package.json');

export default class CapabilitiesAPI {

	constructor(context) {
		this.endpoints = [];
		this.context = context;
	}

	async beforeServerStart(server) {
		server.addEndpoint('get', '/', this.getRoot.bind(this), false, true);
		server.addEndpoint('get', '/.well-known/openeo', this.getVersions.bind(this), false, true);
		server.addEndpoint('get', '/', this.getCapabilities.bind(this));
		server.addEndpoint('get', '/conformance', this.getConformance.bind(this));
		server.addEndpoint('get', '/service_types', this.getServices.bind(this));
		server.addEndpoint('get', '/file_formats', this.getFileFormats.bind(this));
	}

	addEndpoint(method, path) {
		method = method.toUpperCase();
		for (const i in this.endpoints) {
			if (this.endpoints[i].path === path) {
				this.endpoints[i].methods.push(method);
				return;
			}
		}
		this.endpoints.push({
			path: path,
			methods: [method]
		});
	}

	async getRoot(req, res) {
		return res.redirect('/.well-known/openeo', Utils.noop);
	}

	async getVersions(req, res) {
		const versions = this.context.otherVersions.slice(0); // Make sure to clone it
		versions.push({
			url: Utils.getApiUrl(),
			production: this.context.production,
			api_version: this.context.apiVersion
		});
		res.json({ versions });
	}

	async getCapabilities(req, res) {
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
					rel: "self",
					href: Utils.getApiUrl(`/`),
					type: "application/json"
				},
				{
					rel: "root",
					href: Utils.getApiUrl(`/`),
					type: "application/json"
				},
				{
					rel: "service-desc",
					href: `https://raw.githubusercontent.com/Open-EO/openeo-api/${this.context.apiVersion}/openapi.yaml`,
					type: "application/vnd.oai.openapi"
				},
				{
					rel: 'about',
					href: 'https://earthengine.google.com/',
					title: 'Google Earth Engine Homepage'
				},
				{
					rel: 'create-form',
					href: 'https://earthengine.google.com/signup/',
					type: 'text/html',
					title: 'Sign Up for Google Earth Engine'
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
	}

	async getConformance(req, res) {
		res.json({
			"conformsTo": [
				"https://api.openeo.org/1.2.0",
				"https://api.stacspec.org/v1.0.0/core",
				"https://api.stacspec.org/v1.0.0/collections",
				"https://api.stacspec.org/v1.0.0/ogcapi-features",
				"https://api.stacspec.org/v1.0.0/ogcapi-features#sort",
// Item Filter
// 			"http://www.opengis.net/spec/ogcapi-features-3/1.0/conf/features-filter",
// Collection Search
//			"https://api.stacspec.org/v1.0.0-rc.1/collection-search",
//			"http://www.opengis.net/spec/ogcapi-common-2/1.0/conf/simple-query",
// Collection Filter
//			"https://api.stacspec.org/v1.0.0-rc.1/collection-search#filter",
// Collection Sorting
//			"https://api.stacspec.org/v1.0.0-rc.1/collection-search#sort",
				"http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core",
				"http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson",
// CQL2 (for Item and Collection Filter)
// 			"http://www.opengis.net/spec/cql2/1.0/conf/cql2-text",
// 			"http://www.opengis.net/spec/cql2/1.0/conf/basic-cql2",
			]
		});
	}

	async getServices(req, res) {
		res.json(this.context.services);
	}

	transformFormats(formats) {
		const result = {};
		for (const key in formats) {
			result[key] = formats[key].toJSON();
		}
		return result;
	}

	async getFileFormats(req, res) {
		res.json({
			input: this.transformFormats(this.context.inputFormats),
			output: this.transformFormats(this.context.outputFormats)
		});
	}
}
