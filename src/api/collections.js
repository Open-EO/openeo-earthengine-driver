import API from '../utils/API.js';
import Utils from '../utils/utils.js';
import Errors from '../utils/errors.js';
import GeeProcessing from '../processes/utils/processing.js';
import HttpUtils from '../utils/http.js';
import Coverages from './coverages.js';

const sortPropertyMap = {
	'properties.datetime': 'system:time_start',
	'id': 'system:index',
	'properties.title': 'system:index'
};

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
		server.addEndpoint('get', '/collections/{collection_id}/schema', this.getCollectionSchema.bind(this));
		server.addEndpoint('get', '/collections/{collection_id}/coverage', this.getCoverage.bind(this));
		server.addEndpoint('get', '/collections/{collection_id}/items/{item_id}', this.getCollectionItemById.bind(this));
		if (this.context.stacAssetDownloadSize > 0) {
			server.addEndpoint('get', ['/assets/{asset_id}', '/assets/*'], this.getAssetById.bind(this));
		}
		server.addEndpoint('get', ['/thumbnails/{asset_id}', '/thumbnails/*'], this.getThumbnailById.bind(this));

		const a = Date.now();
		const num = await this.catalog.loadCatalog();
		console.log(`Loaded ${num} collections (${Date.now()-a} ms)`);

		const b = Date.now();
		const pContext = this.context.processingContext();
		this.ee = await pContext.connectGee(true);
		console.log(`Established connection to GEE for STAC (${Date.now()-b} ms)`);

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
				experimental: c.experimental,
				deprecated: c.deprecated,
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
					href: API.getUrl("/collections"),
					type: "application/json"
				},
				{
					rel: "root",
					href: API.getUrl("/"),
					type: "application/json"
				},
				{
					rel: "alternate",
					href: API.getUrl("/stac"),
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
		else if (id.endsWith('/schema')) {
			return await this.getCollectionSchema(req, res);
		}
		else if (id.endsWith('/coverage')) {
			return await this.getCoverage(req, res);
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

	getCollectionId(req, endpoint) {
		let id = req.params.collection_id;
		// Get the ID if this was a redirect from another endpoint
		if (req.params['*'] && !id) {
			endpoint = '/' + endpoint;
			id = req.params['*'];
			if (id.endsWith(endpoint)) {
				id = id.substring(0, req.params['*'].length - endpoint.length);
			}
		}
		return id;
	}

	async getCollectionQueryables(req, res) {
		const id = this.getCollectionId(req, 'queryables');
		const queryables = this.catalog.getQueryables(id);
		if (queryables === null) {
			throw new Errors.CollectionNotFound();
		}
		res.json(queryables);
	}

	async getCollectionSchema(req, res) {
		const id = this.getCollectionId(req, 'schema');
		const schema = this.catalog.getSchema(id);
		if (schema === null) {
			throw new Errors.CollectionNotFound();
		}
		res.json(schema);
	}

	async getCoverage(req, res) {
		if (!req.user._id) {
			throw new Errors.AuthenticationRequired();
		}

		const id = this.getCollectionId(req, 'coverage');
		const collection = this.catalog.getData(id);
		if (collection === null) {
			throw new Errors.CollectionNotFound();
		}

		const coverage = new Coverages(collection);
		// Subsetting
		try {
			coverage.setDatetime(req.query.datetime);
		} catch (e) {
			throw new Errors.ParameterValueInvalid({parameter: 'datetime', reason: e.message});
		}
		try {
			coverage.setBoundingBox(req.query.bbox, req.query['bbox-crs']);
		} catch (e) {
			throw new Errors.ParameterValueInvalid({parameter: 'bbox', reason: e.message});
		}
		try {
			coverage.setSubset(req.query.subset, req.query['subset-crs']);
		} catch (e) {
			throw new Errors.ParameterValueInvalid({parameter: 'subset', reason: e.message});
		}
		// Field selection
		try {
			coverage.setFields(req.query.properties);
		} catch (e) {
			throw new Errors.ParameterValueInvalid({parameter: 'properties', reason: e.message});
		}
		// CRS
		try {
			coverage.setCrs(req.query.crs);
		} catch (e) {
			throw new Errors.ParameterValueInvalid({parameter: 'crs', reason: e.message});
		}

		const pngMedia = ['image/png'];
		const gtiffMedia = ['image/tiff', 'image/tiff; application=geotiff'];
		if (req.query.f) {
			if (pngMedia.includes(req.query.f)) {
				coverage.setFileFormat('PNG');
			}
			else if (gtiffMedia.includes(req.query.f)) {
				coverage.setFileFormat('GTIFF');
			}
			else {
				throw new Errors.NotAcceptableError();
			}
		}
		else {
			const isPNG = req.accepts(pngMedia);
			const isGTIFF = req.accepts(gtiffMedia);
			if (isGTIFF) {
				coverage.setFileFormat('GTIFF');
			}
			else if (isPNG) {
				coverage.setFileFormat('PNG');
			}
			else {
				throw new Errors.NotAcceptableError();
			}
		}

		const response = await coverage.execute(this.context, req);

		res.header('Content-Type', response?.headers?.['content-type'] || 'application/octet-stream');
		response.data.pipe(res);
	}

	async getCollectionItems(req, res) {
		const id = this.getCollectionId(req, 'items');
		const collection = this.catalog.getData(id, true);
		if (collection === null) {
			throw new Errors.CollectionNotFound();
		}

		const limit = parseInt(req.query.limit, 10) || 10;
		const offset = parseInt(req.query.offset, 10) || 0;

		// todo: migrate to ee.data.listImages?
		// Load the collection
		let ic = this.ee.ImageCollection(id);

		// Filter by datetime
		const datetime = req.query.datetime || null;
		if (Utils.hasText(datetime)) {
			let datetimes = datetime.split('/');
			if (datetimes.length === 1) {
				ic = ic.filterDate(datetimes[0]);
			}
			else if (datetimes.length === 2) {
				datetimes = datetimes.map(dt => (['..', ''].includes(dt) ? null : dt));
				ic = ic.filterDate(
					datetimes[0] || '0000-01-01',
					datetimes[1] || '9999-12-31'
				);
			}
			else {
				throw new Errors.ParameterValueInvalid({parameter: "datetime", reason: "Invalid number of timestamps."});
			}
		}

		// Filter by bbox
		const bboxCrs = req.query['bbox-crs'] || null;
		if (bboxCrs) {
			throw new Errors.ParameterValueUnsupported({parameter: "bbox-crs", reason: "Bounding Box with CRS is not supported."});
		}
		const bbox = req.query.bbox || null;
		if (Utils.hasText(bbox)) {
			let c = bbox.split(',');
			if (c.length === 6) {
				// Ignore z axis
				c = [c[0], c[1], c[3], c[4]];
			}

			if (c.length === 4) {
				c = c.map(dt => parseFloat(dt));
				if (c.some(coord => isNaN(coord))) {
					throw new Errors.ParameterValueInvalid({parameter: "bbox", reason: "Invalid coordinate value(s)."});
				}
				let geom = this.ee.Geometry(Utils.bboxToGeoJson(c));
				ic = ic.filterBounds(geom);
			}
			else {
				throw new Errors.ParameterValueInvalid({parameter: "bbox", reason: "Invalid number of coordinates."});
			}
		}

		// Sort
		const sortby = req.query.sortby;
		if (Utils.hasText(sortby)) {
			const fields = sortby.split(',');
			if (fields.length > 1) {
				throw new Errors.ParameterValueUnsupported({parameter: "sortby", reason: "Can only sort by one field."});
			}
			let field = fields[0];
			let order = !field.startsWith('-');
			if (['-', '+'].includes(field[0])) {
				field = field.substring(1);
			}
			const prop = sortPropertyMap[field];
			if (!prop) {
				throw new Errors.ParameterValueUnsupported({parameter: "sortby", reason: "Selected field can't be sorted by."});
			}
			ic = ic.sort(prop, order);
		}

		// Limit
		const icList = ic.toList(limit + 1, offset);

		// Retrieve the items
		let items;
		try {
			items = await GeeProcessing.evaluate(icList);
		} catch (e) {
			throw new Errors.Internal({message: e.message});
		}

		let hasNextPage = false;
		// We requested one additional image to check if there is a next page
		if (items.length > limit) {
			hasNextPage = true;
			items.pop();
		}

		Promise.all(items.map(item => this.catalog.itemCache.addItem(item)))
			.then(() => this.catalog.itemCache.removeOutdated())
			.catch(console.error);

		// Convert to STAC
		const features = items.map(item => this.catalog.convertImageToStac(item, collection));
		// Add links
		const links = [
			{
				rel: "self",
				href: API.getUrl(`/collections/${id}/items`),
				type: "application/geo+json"
			},
			{
				rel: "root",
				href: API.getUrl(`/`),
				type: "application/json"
			},
			{
				rel: "collection",
				href: API.getUrl(`/collections/${id}`),
				type: "application/json"
			}
		]
		if (offset > 0) {
			links.push({
				rel: "first",
				href: API.getUrl(`/collections/${id}/items?limit=${limit}&offset=0`),
				type: "application/geo+json"
			});
			links.push({
				rel: "prev",
				href: API.getUrl(`/collections/${id}/items?limit=${limit}&offset=${Math.max(0, offset - limit)}`),
				type: "application/geo+json"
			});
		}
		if (hasNextPage) {
			links.push({
				rel: "next",
				href: API.getUrl(`/collections/${id}/items?limit=${limit}&offset=${offset + limit}`),
				type: "application/geo+json"
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

		const collection = this.catalog.getData(cid, true);
		if (collection === null) {
			throw new Errors.CollectionNotFound();
		}

		const fullId = `${cid}/${id}`;
		let metadata = await this.catalog.itemCache.getItem(fullId);
		if (!metadata) {
			const img = this.ee.Image(fullId);
			try {
				metadata = await GeeProcessing.evaluate(img);
				this.catalog.itemCache.addItem(metadata).catch(console.error);
			} catch (e) {
				throw new Errors.Internal({message: e.message});
			}
		}

		res.json(this.catalog.convertImageToStac(metadata, collection));
	}

	async getThumbnailById(req, res) {
		const id = req.params['*'];
		const filepath = this.catalog.itemCache.getThumbPath(id);

		if (await this.catalog.itemCache.hasThumb(id)) {
			await HttpUtils.sendFile(filepath, res);
		}
		else {
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
					dimensions: 600,
					crs: 'EPSG:3857',
					format: 'png'
				}, (geeUrl, err) => {
					if (typeof err === 'string') {
						reject(new Errors.Internal({message: err}));
					}
					else if (typeof geeUrl !== 'string' || geeUrl.length === 0) {
						reject(new Errors.Internal({message: 'Download URL provided by Google Earth Engine is empty.'}));
					}
					else {
						resolve(geeUrl);
					}
				});
			});

			await HttpUtils.streamToFile(geeURL, filepath, res);
		}
	}

	async getAssetById(req, res) {
		const id = req.params['*'];
		const band = req.query.band || null;

		let img = this.ee.Image(id);
		if (band) {
			img = img.select(band);
		}
		const geeURL = await new Promise((resolve, reject) => {
			img.getDownloadURL({
				dimensions: this.context.stacAssetDownloadSize,
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

		const filename = id.replace(/\//g, '_') + (band ? '_' + band: '') + '.tiff';
		const response = await HttpUtils.stream(geeURL, 'download_stac_asset');
		if (response?.headers?.['content-length']) {
			res.header('Content-Length', response?.headers?.['content-length']);
		}
		res.header('Content-Type', response?.headers?.['content-type'] || 'application/octet-stream');
		res.header('Content-Disposition', `attachment; filename="${filename}"`);
		response.data.pipe(res);

	}

}
