import Utils from '../utils/utils.js';
import Errors from '../utils/errors.js';
import ProcessGraph from '../processgraph/processgraph.js';

export default class StoredProcessGraphs {

	constructor(context) {
		this.storage = context.storedProcessGraphs();
		this.context = context;
	}

	async beforeServerStart(server) {
		server.addEndpoint('post', '/validation', this.postValidation.bind(this));
		server.addEndpoint('get', '/process_graphs', this.getProcessGraphs.bind(this));
		server.addEndpoint('get', '/process_graphs/{process_graph_id}', this.getProcessGraph.bind(this));
		server.addEndpoint('put', '/process_graphs/{process_graph_id}', this.putProcessGraph.bind(this));
		server.addEndpoint('delete', '/process_graphs/{process_graph_id}', this.deleteProcessGraph.bind(this));
		server.addEndpoint('get', '/udp/{token}', this.getProcessGraphByToken.bind(this), false);
	}

	init(req) {
		if (!req.user._id) {
			throw new Errors.AuthenticationRequired();
		}
	}

	async postValidation(req, res) {
		if (!Utils.isObject(req.body)) {
			throw new Errors.RequestBodyMissing();
		}
		const pg = new ProcessGraph(req.body, this.context.processingContext(req));
		const errors = await pg.validate(false);
		res.send(200, {
			errors: errors.toJSON()
		});
	}

	async getProcessGraphs(req, res) {
		this.init(req);

		const query = {
			user_id: req.user._id
		};
		const db = this.storage.database();
		const graphs = await db.findAsync(query);
		res.json({
			processes: graphs.map(pg => this.makeResponse(pg, false)),
			links: []
		});
	}

	async putProcessGraph(req, res) {
		this.init(req);

		if (!Utils.isObject(req.body)) {
			throw new Errors.RequestBodyMissing();
		}
		else if (typeof req.params.process_graph_id !== 'string' || req.params.process_graph_id.match(/^\w+$/i) === null) {
			throw new Errors.ProcessGraphIdInvalid();
		}
		else if (typeof req.body.id !== 'undefined' && req.body.id !== req.params.process_graph_id) {
			throw new Errors.ProcessGraphIdDoesntMatch();
		}
		else if (this.context.processes().get(req.params.process_graph_id) !== null) {
			throw new Errors.PredefinedProcessExists();
		}

		const pg = new ProcessGraph(req.body, this.context.processingContext(req));
		await pg.validate();

		const query = {
			id: req.params.process_graph_id,
			user_id: req.user._id,
			// Set the token for public access
			token: Utils.generateHash(64)
		};
		const data = Object.assign({}, req.body, query);
		const db = this.storage.database();
		const { numAffected } = await db.updateAsync(query, data, { upsert: true });
		if (numAffected === 0) {
			throw new Errors.Internal({message: 'Number of changed processes was zero.'});
		}

		res.send(200);
	}

	async deleteProcessGraph(req, res) {
		this.init(req);

		const query = {
			id: req.params.process_graph_id,
			user_id: req.user._id
		};
		const db = this.storage.database();
		const numRemoved = await db.removeAsync(query);
		if (numRemoved === 0) {
			throw new Errors.ProcessGraphNotFound();
		}
		else {
			res.send(204);
		}
	}

	async getProcessGraph(req, res) {
		this.init(req);
		const pg = await this.storage.getById(req.params.process_graph_id, req.user._id);
		res.json(this.prepareProcess(pg));
	}

	async getProcessGraphByToken(req, res) {
		const pg = await this.storage.getByToken(req.params.token);
		res.json(this.prepareProcess(pg));
	}

	prepareProcess(pg) {
		if (pg.token) {
			if (!Array.isArray(pg.links)) {
				pg.links = [];
			}
			pg.links.push({
				href: Utils.getApiUrl("/udp/" + pg.token),
				rel: 'canonical',
				type: 'application/json'
			});
		}
		return this.makeResponse(pg);
	}

	makeResponse(pg, full = true) {
		const response = {
			id: pg.id
		};
		const optionalFields = ['summary', 'description', 'categories', 'parameters', 'returns', 'deprecated', 'experimental'];
		for(const field of optionalFields) {
			if (typeof pg[field] !== 'undefined') {
				response[field] = pg[field];
			}
		}
		if (full) {
			const fullFields = ['exceptions', 'examples', 'links', 'process_graph'];
			for(const field of fullFields) {
				if (typeof pg[field] !== 'undefined') {
					response[field] = pg[field];
				}
			}
		}
		return response;
	}

}
