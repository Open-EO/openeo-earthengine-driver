const Utils = require('../utils');
const Errors = require('../errors');

module.exports = class Data {

	constructor(context) {
		this.catalog = context.collections();

		this.geeSourceCatalogLink = {
			href: 'https://storage.cloud.google.com/earthengine-stac/catalog/catalog.json', 
			rel: 'alternate',
			type: 'application/json',
			title: 'Machine-readable Earth Engine Data Catalog'
		},
		this.geeBrowsableCatalogLink = {
			rel: 'alternate',
			href: 'https://developers.google.com/earth-engine/datasets/catalog/',
			type: 'text/html',
			title: 'Human-readable Earth Engine Data Catalog'
		};

	}

	beforeServerStart(server) {
		server.addEndpoint('get', '/stac', this.getStacRootCatalog.bind(this));
		server.addEndpoint('get', '/collections', this.getCollections.bind(this));
		server.addEndpoint('get', ['/collections/{collection_id}', '/collections/*'], this.getCollectionById.bind(this));

		server.addAfterServerStartListener(() => this.catalog.fixData());

		return this.catalog.loadCatalog();
	}
	
	getStacRootCatalog(req, res, next) {
		var response = {
			stac_version: "0.6.2",
			id: "openeo-earthengine-driver",
			description: "Google Earth Engine catalog for openEO.",
			links: [
				{
					rel: "self",
					href: Utils.getApiUrl("/stac")
				},
				{
					rel: "alternate",
					href: Utils.getApiUrl("/collections"),
					title: "WFS3 Collections",
					type: "application/json"
				},
				this.geeBrowsableCatalogLink,
				this.geeSourceCatalogLink
			]
		};

		this.catalog.getData().map(d => {
			response.links.push({
				rel: "child",
				href: Utils.getApiUrl("/collections/" + d.id),
				title: d.title,
				type: "application/json"
			});
		});

		res.json(response);
		return next();
	}

	getCollections(req, res, next) {
		var data = this.catalog.getData().map(d => {
			return {
				id: d.id,
				title: d.title,
				description: d.description,
				license: d.license,
				providers: d.providers,
				extent: d.extent,
				links: d.links
			};
		});
		res.json({
			collections: data,
			links: [
				{
					rel: "self",
					href: Utils.getApiUrl("/collections")
				},
				{
					rel: "alternate",
					href: Utils.getApiUrl("/stac"),
					title: "STAC API",
					type: "application/json"
				},
				this.geeBrowsableCatalogLink,
				this.geeSourceCatalogLink
			]
		});
		return next();
	}
	
	getCollectionById(req, res, next) {
		var id = req.params['*'];
		if (id.length === 0) {
			// Redirect to correct route
			return this.getCollections(req, res, next);
		}

		var collection = this.catalog.getData(id);
		if (collection !== null) {
			res.json(collection);
			return next();
		}
		else {
			return next(new Errors.CollectionNotFound());
		}
	}

};
