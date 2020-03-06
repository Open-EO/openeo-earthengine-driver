const Utils = require('../utils');
const Errors = require('../errors');
const ProcessGraph = require('../processgraph/processgraph');
const { ErrorList } = require('@openeo/js-processgraphs');

module.exports = class StoredProcessGraphs {

	constructor(context) {
		this.storage = context.storedProcessGraphs();
		this.context = context;
	}

	beforeServerStart(server) {
		server.addEndpoint('post', '/validation', this.postValidation.bind(this));
		server.addEndpoint('get', '/process_graphs', this.getProcessGraphs.bind(this));
		server.addEndpoint('get', '/process_graphs/{process_graph_id}', this.getProcessGraph.bind(this));
		server.addEndpoint('put', '/process_graphs/{process_graph_id}', this.putProcessGraph.bind(this));
		server.addEndpoint('delete', '/process_graphs/{process_graph_id}', this.deleteProcessGraph.bind(this));

		return Promise.resolve();
	}

	postValidation(req, res, next) {
		if (!Utils.isObject(req.body)) {
			return next(new Errors.RequestBodyMissing());
		}
		var pg = new ProcessGraph(req.body, this.context.processingContext(req));
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

	putProcessGraph(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		else if (!Utils.isObject(req.body)) {
			return next(new Errors.RequestBodyMissing());
		}
		else if (typeof req.params.process_graph_id !== 'string' || req.params.process_graph_id.match(/^\w+$/i) === null) {
			return next(new Errors.ProcessGraphIdInvalid());
		}
		else if (typeof req.body.id !== 'undefined' && req.body.id !== req.params.process_graph_id) {
			return next(new Errors.ProcessGraphIdDoesntMatch());
		}
		else if (this.context.processes().get(req.params.process_graph_id) !== null) {
			return next(new Errors.PredefinedProcessExists());
		}

		// Set the id in the JSON body if not set by the user
		req.body.id = req.params.process_graph_id;

		pg = new ProcessGraph(req.body, this.context.processingContext(req));
		pg.validate().then(() => {
			let query = {
				id: req.body.id,
				user_id: req.user._id
			};
			let data = Object.assign({}, query, req.body);
			this.storage.database().update(
				query,
				data,
				{ upsert: true },
				(err, numReplaced, upsert) => {
					if (err) {
						return next(Errors.wrap(err));
					}
					else {
						console.log(numReplaced, upsert);
						res.send(200);
						return next();
					}
				}
			);
		})
		.catch(e => next(e));
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
