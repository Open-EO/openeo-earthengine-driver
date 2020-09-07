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
		server.addEndpoint('get', '/services/{service_id}/logs', this.getServiceLogs.bind(this));
		server.addEndpoint('get', '/xyz/{service_id}/{z}/{x}/{y}', this.getXYZ.bind(this), false);

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
				let logger = console;
				this.storage.getLogsById(req.params.service_id, Utils.timeId())
					.then(logs => {
						var pg = new ProcessGraph(service.process, context);
						pg.setLogger(logs);
						logger = logs;
						pg.optimizeLoadCollectionRect(rect);
						return pg.execute();
					})
					.then(resultNode => {
						var dataCube = resultNode.getResult();
						dataCube.setOutputFormatParameter('size', '256x256');
						dataCube.setSpatialExtent(rect);
						dataCube.setCrs(3857);
						return context.retrieveResults(dataCube);
					})
					.then(url => {
						logger.debug(`Serving ${url} for tile ${req.params.x}/${req.params.y}/${req.params.z}`);
						res.redirect(url, next);
					})
					.catch(e => {
						logger.error(e);
						return next(Errors.wrap(e));
					});
			} catch(e) {
				return next(Errors.wrap(e));
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
		else if (!Utils.isObject(req.body)) {
			return next(new Errors.RequestBodyMissing());
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
						case 'process':
							var pg = new ProcessGraph(req.body.process, this.context.processingContext(req));
							// ToDo 1.0: Correctly handle service paramaters
							pg.allowUndefinedParameters(false);
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
				return this.storage.getLogsById(req.params.service_id);
			})
			.then(logs => logs.info('Service updated', data))
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
		else if (!Utils.isObject(req.body)) {
			return next(new Errors.RequestBodyMissing());
		}
		else if (!this.context.isValidServiceType(req.body.type)) {
			return next(new Errors.ServiceUnsupported());
		}

		var pg = new ProcessGraph(req.body.process, this.context.processingContext(req));
		// ToDo 1.0: Correctly handle service paramaters
		pg.allowUndefinedParameters(false);
		pg.validate().then(() => {
			// ToDo: Validate data
			var data = {
				title: req.body.title || null,
				description: req.body.description || null,
				process: req.body.process,
				configuration: (typeof req.body === 'object' && Utils.isObject(req.body.configuration)) ? req.body.configuration : {},
				attributes: {},
				type: req.body.type,
				enabled: typeof req.body.enabled === 'boolean' ? req.body.enabled : true,
				created: Utils.getISODateTime(),
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
					// Create logs at creation time to avoid issues described in #51 
					this.storage.getLogsById(service._id).then(() => {
						res.header('OpenEO-Identifier', service._id);
						res.redirect(201, Utils.getApiUrl('/services/' + service._id), next);
					}).catch(e => next(e));
				}
			});
		}).catch(e => next(e));
	}

	getServiceLogs(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		this.storage.getLogsById(req.params.service_id)
		.then(logs => logs.get(req.query.offset, req.query.limit))
		.then(json => {
			res.json(json);
			return next();
		})
		.catch(e => next(Errors.wrap(e)));
	}

	makeServiceResponse(service, full = true) {
		var response = {
			id: service._id,
			title: service.title || null,
			description: service.description || null,
			url: this.makeServiceUrl(service),
			type: service.type.toLowerCase(),
			enabled: typeof service.enabled === 'boolean' ? service.enabled : true,
			created: service.created,
			plan: service.plan,
			costs: service.costs || 0,
			budget: service.budget || null
		};
		if (full) {
			response.process = service.process;
			response.configuration = Utils.isObject(service.configuration) ? service.configuration : {};
			response.attributes = Utils.isObject(service.attributes) ? service.attributes : {};
		}
		return response;
	}

	makeServiceUrl(service) {
		return Utils.getApiUrl('/' + service.type.toLowerCase() + '/' + service._id + "/{z}/{x}/{y}");
	}
	
};
