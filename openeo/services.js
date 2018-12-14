const Utils = require('./utils');
const Errors = require('./errors');
const ProcessUtils = require('./processUtils');

module.exports = class ServicesAPI {

	constructor() {
		this.db = Utils.loadDB('services');
		this.editableFields = ['title', 'description', 'process_graph', 'enabled', 'parameters', 'plan', 'budget'];
	}

	beforeServerStart(server) {
		// Add endpoints
		server.addEndpoint('get', '/services', this.getServices.bind(this));
		server.addEndpoint('post', '/services', this.postService.bind(this));
		server.addEndpoint('get', '/services/{service_id}', this.getService.bind(this));
		server.addEndpoint('patch', '/services/{service_id}', this.patchService.bind(this));
		server.addEndpoint('delete', '/services/{service_id}', this.deleteService.bind(this));
		server.addEndpoint('get', '/xyz/{service_id}/{z}/{x}/{y}', this.getXYZ.bind(this));

		return Promise.resolve();
	}

	calculateXYZRect(x, y, z) {
		x = new Number(x);
		y = new Number(y);
		z = new Number(z);

		// Calculate tile bounds
		// see: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
		var nw_lng = this.tile2long(x, z);
		var nw_lat = this.tile2lat(y, z);
		var se_lng  = this.tile2long(x+1, z);
		var se_lat = this.tile2lat(y+1, z);
		var xMin = Math.min(nw_lng, se_lng);
		var xMax = Math.max(nw_lng, se_lng);
		var yMin = Math.min(nw_lat, se_lat);
		var yMax = Math.max(nw_lat, se_lat);
		return ee.Geometry.Rectangle([xMin, yMin, xMax, yMax], 'EPSG:4326');
	}

	getXYZ(req, res, next) {
		var query = {
			// Tiles are always public!
			// user_id: req.user._id,
			_id: req.params.service_id
		};
		this.db.findOne(query, (err, service) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (service ===  null) {
				return next(new Errors.ServiceNotFound());
			}

			try {
				var rect = this.calculateXYZRect(req.params.x, req.params.y, req.params.z);
				req.processRegistry.executeProcessGraph(req, srvice.process_graph).then(obj => {
					var image = ProcessUtils.toImage(obj, req);
					// Download image
					// ToDo: Replace getThumbURL with getDownloadURL
					image.getThumbURL({
						format: 'jpeg',
						dimensions: '256x256',
						region: rect.bounds().getInfo()
					}, url => {
						if (!url) {
							next(new Errors.Internal({message: 'Download URL provided by Google Earth Engine is empty.'}));
						}
						else {
							console.log("Downloading " + url);
							res.redirect(url, next);
						}
					});
				})
				.catch(e => next(e));
			} catch(e) {
				return next(e);
			}
		});
	}

	tile2long(x, z) {
		return (x / Math.pow(2,z) * 360 - 180);
	}

	tile2lat(y, z) {
		var n = Math.PI - (2*Math.PI*y) / Math.pow(2,z);
		return ((180 / Math.PI) * Math.atan( 0.5*(Math.exp(n)-Math.exp(-n)) ));
	}

	getServices(req, res, next) {
		var query = {
			user_id: req.user._id
		};
		this.db.find(query, {}, (err, services) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else {
				services = services.map(service =>  this.makeServiceResponse(service, false));
				res.json({
					services: services,
					links: []
				});
				return next();
			}
		});
	}
	  
	deleteService(req, res, next) {
		var query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		this.db.remove(query, {}, (err, numRemoved) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (numRemoved === 0) {
				return next(new Errors.ServiceNotFound());
			}
			else {
				res.send(204);
				return next();
			}
		});
	}

	patchService(req, res, next) {
		var query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		this.db.findOne(query, {}, (err, service) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (service === null) {
				return next(new Errors.ServiceNotFound());
			}

			var data = {};
			var promises = [];
			for(let key in req.body) {
				if (this.editableFields.includes(key)) {
					switch(key) {
						case 'process_graph':
							promises.push(req.processRegistry.validateProcessGraph(req, req.body.process_graph));
							break;
						case 'type':
							promises.push(new Promise((resolve, reject) => {
								if (!req.config.isValidServiceType(req.body.type)) {
									reject(new Errors.ServiceUnsupported());
								}
								resolve();
							}));
							break;
						default:
							// ToDo: Validate further data
							// For example, if budget < costs, reject request
					}
					data[key] = req.body[key];
				}
				else {
					return next(new Errors.PropertyNotEditable({property: key}));
				}
			}

			if (Utils.size(data) === 0) {
				return next(new Errors.NoDataForUpdate());
			}

			Promise.all(promises).then(() => {
				this.db.update(query, { $set: data }, {}, function (err, numChanged) {
					if (err) {
						return next(new Errors.Internal(err));
					}
					else if (numChanged === 0) {
						return next(new Error.Internal({message: 'Number of changed elements was 0.'}));
					}
					else {
						res.send(204);
						return next();
					}
				});
			})
			.catch(e => next(Errors.wrap(e)));
		});
	}

	getService(req, res, next) {
		var query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		this.db.findOne(query, {}, (err, service) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (service === null) {
				return next(new Errors.ServiceNotFound());
			}

			res.json(this.makeServiceResponse(service));
			return next();
		});
	}

	postService(req, res, next) {
		if (!req.config.isValidServiceType(req.body.type)) {
			return next(new Errors.ServiceUnsupported());
		}

		req.processRegistry.validateProcessGraph(req, req.body.process_graph).then(() => {
			// ToDo: Validate data
			var data = {
				title: req.body.title || null,
				description: req.body.description || null,
				process_graph: req.body.process_graph,
				parameters: (typeof req.body === 'object' && Utils.isObject(req.body.parameters)) ? req.body.parameters : {},
				attributes: {},
				type: req.body.type,
				enabled: req.body.enabled || true,
				submitted: Utils.getISODateTime(),
				plan: req.body.plan || req.config.plans.default,
				costs: 0,
				budget: req.body.budget || null,
				user_id: req.user._id
			};
			this.db.insert(data, (err, service) => {
				if (err) {
					return next(new Errors.Internal(err));
				}
				else {
					res.header('OpenEO-Identifier', service._id);
					res.redirect(201, Utils.getApiUrl('/services/' + service._id), next);
				}
			});
		}).catch(e => next(e));
	}

	makeServiceResponse(service, full = true) {
		var response = {
			service_id: service._id,
			title: service.title || null,
			description: service.description || null,
			url: this.makeServiceUrl(service),
			type: service.type,
			enabled: service.enabled || true,
			submitted: service.submitted,
			plan: service.plan,
			costs: service.costs || 0,
			budget: service.budget || null
		};
		if (full) {
			response.process_graph = service.process_graph;
			response.parameters = Utils.isObject(service.parameters) ? service.parameters : {};
			response.attributes = Utils.isObject(service.attributes) ? service.attributes : {};
		}
		return response;
	}

	makeServiceUrl(service) {
		return Utils.getApiUrl('/' + service.type + '/' + service._id);
	}
	
};
