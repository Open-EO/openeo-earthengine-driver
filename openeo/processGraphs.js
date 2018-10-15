const Utils = require('./utils');
const ProcessRegistry = require('./processRegistry');
const Errors = require('./errors');

module.exports = class ProcessGraphs {

	constructor() {
		this.db = Utils.loadDB('process_graphs');
	}

	beforeServerStart(server) {
//		server.addEndpoint('get', '/process_graphs', this.getProcessGraphs.bind(this)); // ToDo
//		server.addEndpoint('post', '/process_graphs', this.postProcessGraph.bind(this)); // ToDo
//		server.addEndpoint('get', '/process_graphs/{process_graph_id}', this.getProcessGraphById.bind(this)); // ToDo
//		server.addEndpoint('put', '/process_graphs/{process_graph_id}', this.putProcessGraphById.bind(this)); // ToDo
//		server.addEndpoint('delete', '/process_graphs/{process_graph_id}', this.deleteProcessGraphById.bind(this)); // ToDo

		return new Promise((resolve, reject) => resolve());
	}

	getProcessGraphs(req, res, next) {
		var query = {
			user_id: req.user._id
		};
		this.db.find(query, {}, (err, graphs) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else {
				var data = graphs.map(g => {
					return {
						process_graph_id: g._id,
						title: g.title,
						description: g.description
					};
				});
				res.json({
					process_graphs: data,
					links: []
				});
				return next();
			}
		});
	}

	postProcessGraph(req, res, next) {
		if (typeof req.body !== 'object' || Utils.size(req.body) === 0) {
			res.send(400, "No process_graph specified.");
			return next();
		}
		try {
			ProcessRegistry.parseProcessGraph(req.body, req, res, false);
		} catch (e) {
			console.log(e);
			res.send(400, e); // Invalid process graph
			return next();
		}

		var data = {
			process_graph: req.body,
			user_id: req.user._id
		};
		this.db.insert(data, (err, graph) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else {
				res.json({
					process_graph_id: graph._id
				});
				return next();
			}
		});
	}

	putProcessGraphById(req, res, next) {
		if (typeof req.body !== 'object' || Utils.size(req.body) === 0) {
			res.send(400);
			return next();
		}
		try {
			ProcessRegistry.parseProcessGraph(req.body, req, res, false);
		} catch (e) {
			console.log(e);
			res.send(400, e); // Invalid process graph
			return next();
		}

		var query = {
			_id: req.params.process_graph_id,
			user_id: req.user._id
		};
		this.db.update(query, req.body, {}, (err, numReplaced) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (numReplaced === 0) {
				res.send(404);
				return next();
			}
			else {
				res.send(200);
				return next();
			}
		});
	}

	deleteProcessGraphById(req, res, next) {
		var query = {
			_id: req.params.process_graph_id,
			user_id: req.user._id
		};
		this.db.remove(query, {}, (err, numRemoved) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (numRemoved === 0) {
				res.send(404);
				return next();
			}
			else {
				res.send(200);
				return next();
			}
		});
	}

	getProcessGraphById(req, res, next) {
		var query = {
			_id: req.params.process_graph_id,
			user_id: req.user._id
		};
		this.db.findOne(query, {}, (err, pg) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (pg === null) {
				res.send(404);
				return next();
			}
			else {
				res.json(pg.process_graph);
				return next();
			}
		});
	}

};
