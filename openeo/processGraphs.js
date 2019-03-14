const Utils = require('./utils');
const Errors = require('./errors');

module.exports = class ProcessGraphs {

	constructor() {
		this.db = Utils.loadDB('process_graphs');
		this.editableFields = ['title', 'description', 'process_graph', 'public'];
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
		req.processRegistry.validateProcessGraph(req, req.body.process_graph).then(() => {
			res.send(204);
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
		this.db.find(query, {}, (err, graphs) => {
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
		req.processRegistry.validateProcessGraph(req, req.body.process_graph).then(() => {
			var data = {
				title: req.body.title || null,
				description: req.body.description || null,
				process_graph: req.body.process_graph,
				public: req.body.public || false,
				user_id: req.user._id
			};
			this.db.insert(data, (err, pg) => {
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
		this.db.findOne(query, {}, (err, pg) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (pg === null) {
				return next(new Errors.ProcessGraphNotFound());
			}

			var data = {};
			var promises = [];
			for(let key in req.body) {
				if (this.editableFields.includes(key)) {
					switch(key) {
						case 'process_graph':
							promises.push(req.processRegistry.validateProcessGraph(req, req.body.process_graph));
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

	deleteProcessGraph(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			_id: req.params.process_graph_id,
			user_id: req.user._id
		};
		this.db.remove(query, {}, (err, numRemoved) => {
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
		// ToDo: Implement process graph variables
		this.getById(req.params.process_graph_id, req.user._id).then(pg => {
			res.json(this.makeResponse(pg));
			next();
		})
		.catch(err => next(err));
	}

	getById(id, user_id) {
		return new Promise((resolve, reject) => {
			this.db.findOne({_id: id}, {}, (err, pg) => {
				if (err) {
					reject(new Errors.Internal(err));
				}
				else if (pg === null || (pg.public !== true && pg.user_id !== user_id)) {
					reject(new Errors.ProcessGraphNotFound());
				}
				else {
					resolve(pg);
				}
			});
		});
	}

	makeResponse(pg, full = true) {
		var response = {
			process_graph_id: pg._id,
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
