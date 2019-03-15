const Utils = require('./utils');
const Errors = require('./errors');
const fse = require('fs-extra');
const {Storage} = require('@google-cloud/storage');

module.exports = class Data {

	constructor() {
		this.dataFolder = 'storage/collections/';

		this.collections = {};
		this.collections_fixed = false;

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

		return this.loadCatalog();
	}

	readLocalCatalog() {
		this.collections = {};
		var files = fse.readdirSync(this.dataFolder, {withFileTypes: true});
		for(var i in files) {
			let file = files[i];
			if (file.isFile() && file.name !== 'catalog.json') {
				let collection = fse.readJsonSync(this.dataFolder + file.name);
				this.collections[collection.id] = collection;
			}
		}
	}

	updateCatalog() {
		// To refresh the catalog manually, delete the catalog.json.
		let catalogFile = this.dataFolder + 'catalog.json';
		if (fse.existsSync(catalogFile)) {
			let fileTime = new Date(fse.statSync(catalogFile).ctime).getTime();
			let expiryTime = new Date().getTime() - 24 * 60 * 60 * 1000; // Expiry time: A day
			if (fileTime > expiryTime) {
				return Promise.resolve();
			}
		}

		console.log('Refreshing GEE catalog...');
		const storage = new Storage({
			keyFile: './privatekey.json'
		});
		const bucket = storage.bucket('earthengine-stac');
		const prefix = 'catalog/';
		return bucket.getFiles({
			prefix: prefix
		})
		.then(data => {
			let promises = [];
			for(var i in data[0]) {
				let file = data[0][i];
				promises.push(file.download({
					destination: this.dataFolder + file.name.replace(prefix, '')
				}));
			};
			return Promise.all(promises);
		});
	}

	loadCatalog() {
		return this.updateCatalog().then(() => {
			this.readLocalCatalog();
			console.log("Loaded catalog with " + Utils.size(this.collections) + " collections.");
			return Promise.resolve();
		});
	}

	getData(id = null) {
		this.fixData();
		if (id !== null) {
			if (typeof this.collections[id] !== 'undefined') {
				return this.collections[id];
			}
			else {
				return null;
			}
		}
		else {
			return Object.values(this.collections);
		}
	}

	fixData() {
		if (this.collections_fixed) {
			return;
		}
		for(var i in this.collections) {
			let c = this.collections[i];
			c.stac_version = "0.6.2";
			if (Array.isArray(c.properties["eo:bands"])) {
				for(let i in c.properties["eo:bands"]) {
					// This entry currently holds invalid information
					delete c.properties["eo:bands"][i].gsd;
				}
			}
			c.links = c.links.map(l => {
				switch(l.rel) {
					case 'self':
						l.href = Utils.getApiUrl("/collections/" + c.id);
						break;
					case 'parent':
					case 'root':
						l.href = Utils.getApiUrl("/collections");
						break;
				}
				return l;
			});
			this.collections[i] = c;
		}
		this.collections_fixed = true;
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

		this.getData().map(d => {
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
		var data = this.getData().map(d => {
			return {
				name: d.name,
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

		var collection = this.getData(id);
		if (collection !== null) {
			res.json(collection);
			return next();
		}
		else {
			return next(new Errors.CollectionNotFound());
		}
	}

};
