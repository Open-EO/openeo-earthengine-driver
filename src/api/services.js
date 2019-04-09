const Utils = require('../utils');
const Errors = require('../errors');

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

	calculateXYZRect(x, y, z) {
		return ee.Geometry.Rectangle(this.storage.calculateXYZRect(x, y, z), 'EPSG:4326');
	}

	getXYZ(req, res, next) {
		var query = {
			// Tiles are always public!
			// user_id: req.user._id,
			_id: req.params.service_id
		};
		this.storage.database().findOne(query, (err, service) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (service ===  null) {
				return next(new Errors.ServiceNotFound());
			}

			try {
				var rect = this.calculateXYZRect(req.params.x, req.params.y, req.params.z);
				var runner = this.context.runner(service.process_graph);
				var context = runner.createContextFromRequest(req);
				runner.validate(context)
					.then(() => runner.execute(context))
					.then(resultNode => context.retrieveResults(resultNode.getResult(), '256x256', "jpeg", rect))
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
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		this.storage.database().remove(query, {}, (err, numRemoved) => {
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
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		this.storage.database().findOne(query, {}, (err, service) => {
			if (err) {
				return next(new Errors.Internal(err));
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
							var runner = this.context.runner(req.body.process_graph);
							promises.push(runner.validateRequest(req));
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
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		this.storage.database().findOne(query, {}, (err, service) => {
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
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		if (!this.context.isValidServiceType(req.body.type)) {
			return next(new Errors.ServiceUnsupported());
		}

		var runner = this.context.runner(req.body.process_graph);
		runner.validateRequest(req).then(() => {
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
				plan: req.body.plan || this.context.plans.default,
				costs: 0,
				budget: req.body.budget || null,
				user_id: req.user._id
			};
			this.storage.database().insert(data, (err, service) => {
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
			id: service._id,
			title: service.title || null,
			description: service.description || null,
			url: this.makeServiceUrl(service),
			type: service.type.toLowerCase(),
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
		return Utils.getApiUrl('/' + service.type.toLowerCase() + '/' + service._id);
	}
	
};
