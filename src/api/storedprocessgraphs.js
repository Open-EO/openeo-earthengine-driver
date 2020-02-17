const Utils = require('../utils');
const Errors = require('../errors');
const ProcessGraph = require('../processgraph/processgraph');

module.exports = class StoredProcessGraphs {

	constructor(context) {
		this.storage = context.storedProcessGraphs();
		this.context = context;
	}

	beforeServerStart(server) {
		server.addEndpoint('post', '/validation', this.postValidation.bind(this));
		server.addEndpoint('get', '/process_graphs', this.getProcessGraphs.bind(this));
		server.addEndpoint('post', '/process_graphs', this.postProcessGraph.bind(this));
		server.addEndpoint('get', '/process_graphs/{process_graph_id}', this.getProcessGraph.bind(this));
		server.addEndpoint('patch', '/process_graphs/{process_graph_id}', this.patchProcessGraph.bind(this));
		server.addEndpoint('delete', '/process_graphs/{process_graph_id}', this.deleteProcessGraph.bind(this));

		return Promise.resolve();
	}

	postValidation(req, res, next) {
		if (!Utils.isObject(req.body)) {
			return next(new Errors.RequestBodyMissing());
		}
		var pg = new ProcessGraph(req.body.process_graph, this.context.processingContext(req));
		pg.validate(false)
			.then(errors => {
				res.send(200, {
					errors: errors.toJSON()
				});
				next();
			})
			.catch(e => next(e));
	}

	getProcessGraphs(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			user_id: req.user._id
		};
		this.storage.database().find(query, {}, (err, graphs) => {
			if (err) {
				return next(Errors.wrap(err));
			}
			else {
				var data = graphs.map(pg => this.makeResponse(pg, false));
				res.json({
					processes: data,
					links: []
				});
				return next();
			}
		});
	}

	postProcessGraph(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		else if (!Utils.isObject(req.body)) {
			return next(new Errors.RequestBodyMissing());
		}
		else if (typeof req.body.id !== 'string' || req.body.id.match(/^\w+$/i) === null) {
			return next(new Errors.ProcessGraphIdInvalid());
		}

		let query = {
			id: req.body.id,
			user_id: req.user._id
		};
		this.storage.database().findOne(query, {}, (err, pg) => {
			if (err) {
				return next(Errors.wrap(err));
			}
			else if (pg === null) {
				pg = new ProcessGraph(req.body.process_graph, this.context.processingContext(req));
				pg.validate()
					.then(() => {
						var data = {
							user_id: req.user._id
						};
						for(let field of this.storage.getFields()) {
							if (typeof req.body[field] !== 'undefined') {
								data[field] = req.body[field];
							}
						}
						this.storage.database().insert(data, (err, pgObj) => {
							if (err) {
								return next(Errors.wrap(err));
							}
							else {
								res.header('OpenEO-Identifier', pgObj.id);
								res.redirect(201, Utils.getApiUrl('/process_graphs/' + pgObj.id), next);
							}
						});
					})
					.catch(e => next(e));
			}
			else {
				return next(new Errors.ProcessGraphIdExists());
			}
		});
	}

	patchProcessGraph(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		else if (!Utils.isObject(req.body)) {
			return next(new Errors.RequestBodyMissing());
		}
		else if (typeof req.body.id !== 'undefined' && req.body.id !== req.params.process_graph_id) {
			return next(new Errors.PropertyNotEditable({property: 'id'}));
		}
		var query = {
			id: req.params.process_graph_id,
			user_id: req.user._id
		};
		this.storage.database().findOne(query, {}, (err, pg) => {
			if (err) {
				return next(Errors.wrap(err));
			}
			else if (pg === null) {
				return next(new Errors.ProcessGraphNotFound());
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
						default:
							// ToDo: Validate further data
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

	deleteProcessGraph(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			id: req.params.process_graph_id,
			user_id: req.user._id
		};
		this.storage.database().remove(query, {}, (err, numRemoved) => {
			if (err) {
				return next(Errors.wrap(err));
			}
			else if (numRemoved === 0) {
				return next(new Errors.ProcessGraphNotFound());
			}
			else {
				res.send(204);
				return next();
			}
		});
	}

	getProcessGraph(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		this.storage.getById(req.params.process_graph_id, req.user._id).then(pg => {
			res.json(this.makeResponse(pg));
			next();
		})
		.catch(err => next(err));
	}

	makeResponse(pg, full = true) {
		var response = {
			id: pg.id
		};
		let optionalFields = ['summary', 'description', 'categories', 'parameters', 'returns', 'deprecated', 'experimental'];
		for(let field of optionalFields) {
			if (typeof pg[field] !== 'undefined') {
				response[field] = pg[field];
			}
		}
		if (full) {
			let fullFields = ['exceptions', 'examples', 'links', 'process_graph'];
			for(let field of fullFields) {
				if (typeof pg[field] !== 'undefined') {
					response[field] = pg[field];
				}
			}
		}
		return response;
	}

};
