const Utils = require('../utils/utils');
const Errors = require('../utils/errors');

module.exports = class Data {

	constructor(context) {
		this.catalog = context.collections();

		this.geeSourceCatalogLink = {
			href: 'https://earthengine-stac.storage.googleapis.com/catalog/catalog.json', 
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

	async beforeServerStart(server) {
		server.addEndpoint('get', '/collections', this.getCollections.bind(this));
		server.addEndpoint('get', ['/collections/{collection_id}', '/collections/*'], this.getCollectionById.bind(this));
		// ToDo 1.2: New endpoint for metadata filters (queryables): /collections/{collection_id}/queryables. Also adds a new rel type to the collection links. #396

		const num = await this.catalog.loadCatalog();
		console.log(`Loaded ${num} collections.`);
		return num;
	}

	async getCollections(req, res) {
		var data = this.catalog.getData().map(c => {
			return {
				stac_version: c.stac_version,
				stac_extensions: [],
				type: c.type,
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
	}
	
	async getCollectionById(req, res) {
		var id = req.params['*'];
		if (id.length === 0) {
			// Redirect to correct route
			return this.getCollections(req, res, next);
		}

		var collection = this.catalog.getData(id);
		if (collection === null) {
			throw new Errors.CollectionNotFound();
		}

		res.json(collection);
	}

};
