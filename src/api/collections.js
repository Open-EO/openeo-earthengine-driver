import Utils from '../utils/utils.js';
import Errors from '../utils/errors.js';
import GeeProcessing from '../processes/utils/processing.js';

export default class Data {

	constructor(context) {
		this.context = context;
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
		// Some endpoints may be routed through the /collections/{collection_id} endpoint due to the wildcard
		server.addEndpoint('get', ['/collections/{collection_id}', '/collections/*'], this.getCollectionById.bind(this));
		server.addEndpoint('get', '/collections/{collection_id}/queryables', this.getCollectionQueryables.bind(this));
		server.addEndpoint('get', '/collections/{collection_id}/items', this.getCollectionItems.bind(this));
		server.addEndpoint('get', '/collections/{collection_id}/items/{item_id}', this.getCollectionItemById.bind(this));
		if (this.context.stacAssetDownload) {
			server.addEndpoint('get', ['/assets/{asset_id}', '/assets/*'], this.getAssetById.bind(this));
		}
		server.addEndpoint('get', ['/thumbnails/{asset_id}', '/thumbnails/*'], this.getThumbnailById.bind(this));

		const num = await this.catalog.loadCatalog();
		console.log(`Loaded ${num} collections.`);

		const pContext = this.context.processingContext({});
		this.ee = await pContext.connectGee(true);
		console.log(`Established connection to GEE for STAC`);

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
		// Some endpoints may be routed through the /collections/{collection_id} endpoint due to the wildcard
		else if (id.endsWith('/queryables')) {
			return await this.getCollectionQueryables(req, res);
		}
		else if (id.endsWith('/items')) {
			return await this.getCollectionItems(req, res);
		}
		else if (id.match(/\/items\/[^/]+$/)) {
			return await this.getCollectionItemById(req, res);
		}

		const collection = this.catalog.getData(id);
		if (collection === null) {
			throw new Errors.CollectionNotFound();
		}

		res.json(collection);
	}

	async getCollectionQueryables(req, res) {
		let id = req.params.collection_id;
		// Get the ID if this was a redirect from the /collections/{collection_id} endpoint
		if (req.params['*'] && !id) {
			id = req.params['*'].replace(/\/queryables$/, '');
		}

		const queryables = this.catalog.getSchema(id);
		if (queryables === null) {
			throw new Errors.CollectionNotFound();
		}

		res.json(queryables);
	}

	async getCollectionItems(req, res) {
		let id = req.params.collection_id;
		// Get the ID if this was a redirect from the /collections/{collection_id} endpoint
		if (req.params['*'] && !id) {
			id = req.params['*'].replace(/\/items$/, '');
		}

		const collection = this.catalog.getData(id);
		if (collection === null) {
			throw new Errors.CollectionNotFound();
		}

		const limit = parseInt(req.query.limit, 10) || 10;
		const offset = parseInt(req.query.offset, 10) || 0;

		// Load the collection and read a "page" of items
		const ic = this.ee.ImageCollection(id).toList(limit + 1, offset);
		// Retrieve the items
		let items;
		try {
			items = await GeeProcessing.evaluate(ic);
		} catch (e) {
			throw new Errors.Internal({message: e.message});
		}

		let hasNextPage = false;
		// We requested one additional image to check if there is a next page
		if (items.length > limit) {
			hasNextPage = true;
			items.pop();
		}

		// Convert to STAC
		const features = items.map(item => this.catalog.convertImageToStac(item, id));
		// Add links
		const links = [
			{
				rel: "self",
				href: Utils.getApiUrl(`/collections/${id}/items`),
				type: "application/json"
			}
		]
		if (offset > 0) {
			links.push({
				rel: "first",
				href: Utils.getApiUrl(`/collections/${id}/items?limit=${limit}&offset=0`),
				type: "application/json"
			});
			links.push({
				rel: "prev",
				href: Utils.getApiUrl(`/collections/${id}/items?limit=${limit}&offset=${Math.max(0, offset - limit)}`),
				type: "application/json"
			});
		}
		if (hasNextPage) {
			links.push({
				rel: "next",
				href: Utils.getApiUrl(`/collections/${id}/items?limit=${limit}&offset=${offset + limit}`),
				type: "application/json"
			});
		}

		res.json({
			type: "FeatureCollection",
			features,
			links,
			timeStamp: Utils.toISODate(Date.now()),
			numberReturned: features.length
		});
	}

	async getCollectionItemById(req, res) {
		let cid = req.params.collection_id;
		let id = req.params.item_id;
		// Get the ID if this was a redirect from the /collections/{collection_id} endpoint
		if (req.params['*'] && (!cid || !id)) {
			let match = req.params['*'].match(/(.+)\/items\/([^/]+)$/);
			cid = match[1];
			id = match[2];
		}

		const collection = this.catalog.getData(cid);
		if (collection === null) {
			throw new Errors.CollectionNotFound();
		}

		// Load the collection and read a "page" of items
		const img = this.ee.Image(cid + '/' + id);
		// Retrieve the item
		let metadata;
		try {
			metadata = await GeeProcessing.evaluate(img);
		} catch (e) {
			throw new Errors.Internal({message: e.message});
		}
		// Convert to STAC and deliver
		res.json(this.catalog.convertImageToStac(metadata, cid));
	}

	async getThumbnailById(req, res) {
		const id = req.params['*'];

		const idParts = id.split('/');
		idParts.pop();
		const cid = idParts.join('/');

		const vis = this.catalog.getImageVisualization(cid);
		if (vis === null) {
			throw new Errors.Internal({message: 'No visualization parameters found.'});
		}

		const img = this.ee.Image(id);
		const geeURL = await new Promise((resolve, reject) => {
			img.visualize(vis.band_vis).getThumbURL({
				dimensions: 1000,
				crs: 'EPSG:3857',
				format: 'jpg'
			}, (url, err) => {
				if (typeof err === 'string') {
					reject(new Errors.Internal({message: err}));
				}
				else if (typeof url !== 'string' || url.length === 0) {
					reject(new Errors.Internal({message: 'Download URL provided by Google Earth Engine is empty.'}));
				}
				else {
					resolve(url);
				}
			});
		});

		return res.redirect(geeURL, Utils.noop);
	}

	async getAssetById(req, res) {
		const id = req.params['*'];

		const img = this.ee.Image(id);
		const crs = 'EPSG:4326';
		const geeURL = await new Promise((resolve, reject) => {
			img.getDownloadURL({
				dimensions: 1000,
				region: img.geometry(null, crs),
				crs,
				filePerBand: false,
				format: 'GEO_TIFF'
			}, (url, err) => {
				if (typeof err === 'string') {
					reject(new Errors.Internal({message: err}));
				}
				else if (typeof url !== 'string' || url.length === 0) {
					reject(new Errors.Internal({message: 'Download URL provided by Google Earth Engine is empty.'}));
				}
				else {
					resolve(url);
				}
			});
		});

		return res.redirect(geeURL, Utils.noop);
	}

}
