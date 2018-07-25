const Utils = require('./utils');
const ProcessRegistry = require('./processRegistry');

var ProcessGraphs = {

	db: null,

	init() {
		this.db = Utils.loadDB('process_graphs');
		console.log("INFO: Process graphs loaded.");
		return new Promise((resolve, reject) => resolve());
	},

	routes(server) {
		server.addEndpoint('get', '/users/{user_id}/process_graphs', this.getProcessGraphs.bind(this));
		server.addEndpoint('post', '/users/{user_id}/process_graphs', this.postProcessGraph.bind(this));
		server.addEndpoint('get', '/users/{user_id}/process_graphs/{process_graph_id}', this.getProcessGraphById.bind(this));
		server.addEndpoint('put', '/users/{user_id}/process_graphs/{process_graph_id}', this.putProcessGraphById.bind(this));
		server.addEndpoint('delete', '/users/{user_id}/process_graphs/{process_graph_id}', this.deleteProcessGraphById.bind(this));
	},

	getProcessGraphs(req, res, next) {
		var query = {
			user_id: req.user._id
		};
		this.db.find(query, {}, (err, graphs) => {
			if (err) {
				console.log(err);
				res.send(500, err);
				return next();
			}
			else {
				var data = [];
				for(var i in graphs) {
					data.push(graphs[i]._id);
				}
				res.json(data);
				return next();
			}
		});
	},

	postProcessGraph(req, res, next) {
		if (typeof req.body !== 'object' || Utils.size(req.body) === 0) {
			res.send(400, "No process_graph specified.");
			return next();
		}
		try {
			ProcessRegistry.parseProcessGraph(req, req.body, false);
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
				console.log(err);
				res.send(500, err);
				return next();
			}
			else {
				res.json({
					process_graph_id: graph._id
				});
				return next();
			}
		});
	},

	putProcessGraphById(req, res, next) {
		if (typeof req.body !== 'object' || Utils.size(req.body) === 0) {
			res.send(400);
			return next();
		}
		try {
			ProcessRegistry.parseProcessGraph(req, req.body, false);
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
				console.log(err);
				res.send(500, err);
				return next();
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
	},

	deleteProcessGraphById(req, res, next) {
		var query = {
			_id: req.params.process_graph_id,
			user_id: req.user._id
		};
		this.db.remove(query, {}, (err, numRemoved) => {
			if (err) {
				console.log(err);
				res.send(500, err);
				return next();
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
	},

	getProcessGraphById(req, res, next) {
		var query = {
			_id: req.params.process_graph_id,
			user_id: req.user._id
		};
		this.db.findOne(query, {}, (err, pg) => {
			if (err) {
				console.log(err);
				res.send(500, err);
				return next();
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

module.exports = ProcessGraphs;
