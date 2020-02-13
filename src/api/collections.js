const Utils = require('../utils');
const Errors = require('../errors');
const { MigrateCollections } = require('@openeo/js-commons');

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
		server.addEndpoint('get', '/collections', this.getCollections.bind(this));
		server.addEndpoint('get', ['/collections/{collection_id}', '/collections/*'], this.getCollectionById.bind(this));

		server.addAfterServerStartListener(() => this.catalog.fixData());

		return this.catalog.loadCatalog();
	}

	getCollections(req, res, next) {
		var data = this.catalog.getData().map(c => {
			// ToDo 1.0: Remove temporary workaround to convert old collections to current spec
			c = MigrateCollections.convertCollectionToLatestSpec(c, "0.4.2");
			return {
				stac_version: c.stac_version,
				stac_extensions: [],
				id: c.id,
				title: c.title,
				description: c.description,
				license: c.license,
				providers: c.providers,
				extent: c.extent,
				links: c.links
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
			res.json(MigrateCollections.convertCollectionToLatestSpec(collection, "0.4.2"));
			return next();
		}
		else {
			return next(new Errors.CollectionNotFound());
		}
	}

};
