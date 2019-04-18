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
				return next(new Errors.Internal(err));
			}
			else {
				var data = graphs.map(pg => this.makeResponse(pg, false));
				res.json({
					process_graphs: data,
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

		var pg = new ProcessGraph(req.body.process_graph, this.context.processingContext(req));
		pg.validate()
			.then(() => {
				var data = {
					title: req.body.title || null,
					description: req.body.description || null,
					process_graph: req.body.process_graph,
					public: req.body.public || false,
					user_id: req.user._id
				};
				this.storage.database().insert(data, (err, pg) => {
					if (err) {
						return next(new Errors.Internal(err));
					}
					else {
						res.header('OpenEO-Identifier', pg._id);
						res.redirect(201, Utils.getApiUrl('/process_graphs/' + pg._id), next);
					}
				});
			})
			.catch(e => next(e));
	}

	patchProcessGraph(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			_id: req.params.process_graph_id,
			user_id: req.user._id
		};
		this.storage.database().findOne(query, {}, (err, pg) => {
			if (err) {
				return next(new Errors.Internal(err));
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

	deleteProcessGraph(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			_id: req.params.process_graph_id,
			user_id: req.user._id
		};
		this.storage.database().remove(query, {}, (err, numRemoved) => {
			if (err) {
				return next(new Errors.Internal(err));
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
			id: pg._id,
			title: pg.title || null,
			description: pg.description || null,
			public: pg.public || false
		};
		if (full) {
			response.process_graph = pg.process_graph;
		}
		return response;
	}

};
