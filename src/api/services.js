const Utils = require('../utils');
const Errors = require('../errors');
const ProcessGraph = require('../processgraph/processgraph');

module.exports = class ServicesAPI {

	constructor(context) {
		this.storage = context.webServices();
		this.context = context;
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

	getXYZ(req, res, next) {
		var query = {
			// Tiles are always public!
			// user_id: req.user._id,
			_id: req.params.service_id
		};
		this.storage.database().findOne(query, (err, service) => {
			if (err) {
				return next(Errors.wrap(err));
			}
			else if (service ===  null) {
				return next(new Errors.ServiceNotFound());
			}

			try {
				var rect = this.storage.calculateXYZRect(req.params.x, req.params.y, req.params.z);
				var context = this.context.processingContext(req);
				// Update user id to the user id, which stored the job. See https://github.com/Open-EO/openeo-earthengine-driver/issues/19
				context.setUserId(service.user_id);
				var pg = new ProcessGraph(service.process_graph, context);
				pg.optimizeLoadCollectionRect(rect);
				pg.execute()
					.then(resultNode => context.retrieveResults(resultNode.getResult(), '256x256', rect))
					.then(url => {
						if (this.context.debug) {
							console.log("Serving " + url);
						}
						res.redirect(url, next);
					})
					.catch(e => next(Errors.wrap(e)));
			} catch(e) {
				return next(e);
			}
		});
	}

	getServices(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			user_id: req.user._id
		};
		this.storage.database().find(query, {}, (err, services) => {
			if (err) {
				return next(Errors.wrap(err));
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
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		this.storage.database().remove(query, {}, (err, numRemoved) => {
			if (err) {
				return next(Errors.wrap(err));
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
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		this.storage.database().findOne(query, {}, (err, service) => {
			if (err) {
				return next(Errors.wrap(err));
			}
			else if (service === null) {
				return next(new Errors.ServiceNotFound());
			}

			var data = {};
			var promises = [];
			for(let key in req.body) {
				if (this.storage.isFieldEditable(key)) {
					switch(key) {
						case 'process_graph':
						var pg = new ProcessGraph(req.body.process_graph, this.context.processingContext(req));
							promises.push(pg.validate());
							break;
						case 'type':
							promises.push(new Promise((resolve, reject) => {
								if (!this.context.isValidServiceType(req.body.type)) {
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
				this.storage.database().update(query, { $set: data }, {}, function (err, numChanged) {
					if (err) {
						return next(Errors.wrap(err));
					}
					else if (numChanged === 0) {
						return next(new Errors.Internal({message: 'Number of changed elements was 0.'}));
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
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		this.storage.database().findOne(query, {}, (err, service) => {
			if (err) {
				return next(Errors.wrap(err));
			}
			else if (service === null) {
				return next(new Errors.ServiceNotFound());
			}

			res.json(this.makeServiceResponse(service));
			return next();
		});
	}

	postService(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		if (!this.context.isValidServiceType(req.body.type)) {
			return next(new Errors.ServiceUnsupported());
		}

		var pg = new ProcessGraph(req.body.process_graph, this.context.processingContext(req));
		pg.validate().then(() => {
			// ToDo: Validate data
			var data = {
				title: req.body.title || null,
				description: req.body.description || null,
				process_graph: req.body.process_graph,
				parameters: (typeof req.body === 'object' && Utils.isObject(req.body.parameters)) ? req.body.parameters : {},
				attributes: {},
				type: req.body.type,
				enabled: typeof req.body.enabled === 'boolean' ? req.body.enabled : true,
				submitted: Utils.getISODateTime(),
				plan: req.body.plan || this.context.plans.default,
				costs: 0,
				budget: req.body.budget || null,
				user_id: req.user._id
			};
			this.storage.database().insert(data, (err, service) => {
				if (err) {
					return next(Errors.wrap(err));
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
			id: service._id,
			title: service.title || null,
			description: service.description || null,
			url: this.makeServiceUrl(service),
			type: service.type.toLowerCase(),
			enabled: typeof service.enabled === 'boolean' ? service.enabled : true,
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
		return Utils.getApiUrl('/' + service.type.toLowerCase() + '/' + service._id + "/{z}/{x}/{y}");
	}
	
};
