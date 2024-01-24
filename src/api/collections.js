import Utils from '../utils/utils.js';
import Errors from '../utils/errors.js';

export default class Data {

	constructor(context) {
		this.catalog = context.collections();

		this.geeSourceCatalogLink = {
			href: 'https://earthengine-stac.storage.googleapis.com/catalog/catalog.json',
			rel: 'alternate',
			type: 'application/json',
			title: 'Machine-readable Earth Engine Data Catalog'
		};
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
		server.addEndpoint('get', '/collections/{collection_id}/queryables', this.getCollectionQueryables.bind(this));
		// Some queryables may be routed through the /collections/{collection_id} endpoint due to the wildcard

		const num = await this.catalog.loadCatalog();
		console.log(`Loaded ${num} collections.`);
		return num;
	}

	async getCollections(req, res) {
		const data = this.catalog.getData().map(c => {
			return {
				stac_version: c.stac_version,
				stac_extensions: [],
				type: c.type,
				id: c.id,
				title: c.title,
				description: c.description,
				license: c.license,
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
		const id = req.params['*'];
		if (id.length === 0) {
			// Redirect to correct route
			return await this.getCollections(req, res);
		}
		// Some queryables may be routed through the /collections/{collection_id} endpoint due to the wildcard
		else if (id.endsWith('/queryables')) {
			return await this.getCollectionQueryables(req, res);
		}

		const collection = this.catalog.getData(id);
		if (collection === null) {
			throw new Errors.CollectionNotFound();
		}

		res.json(collection);
	}

	async getCollectionQueryables(req, res) {
		// Get the ID from the normal parameter
		let id = req.params.collection_id;
		// Get the ID if this was a redirect from the /collections/{collection_id} endpoint
		if (req.params['*'] && !req.params.collection_id) {
			id = req.params['*'].replace(/\/queryables$/, '');
		}

		const collection = this.catalog.getData(id);
		if (collection === null) {
			throw new Errors.CollectionNotFound();
		}
		res.json({
			"$schema" : "https://json-schema.org/draft/2019-09/schema",
			"$id" : Utils.getApiUrl(`/collections/${id}/queryables`),
			"title" : "Queryables",
			"type" : "object",
			"properties" : {},
			"additionalProperties": false
		});
	}

}
