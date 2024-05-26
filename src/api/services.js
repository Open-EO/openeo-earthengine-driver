import API from '../utils/API.js';
import Utils from '../utils/utils.js';
import Errors from '../utils/errors.js';
import ProcessGraph from '../processgraph/processgraph.js';
import Logs from '../models/logs.js';
import runWebService from './worker/webservice.js';

export default class ServicesAPI {

	constructor(context) {
		this.storage = context.webServices();
		this.context = context;
	}

	async beforeServerStart(server) {
		// Add endpoints
		server.addEndpoint('get', '/services', this.getServices.bind(this));
		server.addEndpoint('post', '/services', this.postService.bind(this));
		server.addEndpoint('get', '/services/{service_id}', this.getService.bind(this));
		server.addEndpoint('patch', '/services/{service_id}', this.patchService.bind(this));
		server.addEndpoint('delete', '/services/{service_id}', this.deleteService.bind(this));
		server.addEndpoint('get', '/services/{service_id}/logs', this.getServiceLogs.bind(this));
		server.addEndpoint('get', '/xyz/{service_id}/{z}/{x}/{y}', this.getXYZ.bind(this), false);
	}

	init(req) {
		if (!req.user._id) {
			throw new Errors.AuthenticationRequired();
		}
	}

	async getXYZ(req, res) {
		const query = {
			// Tiles are always public!
			// user_id: req.user._id,
			_id: req.params.service_id,
			// Check that the service is enabled
			enabled: true
		};
		const xyz = [req.params.x, req.params.y, req.params.z];

		const service = await this.storage.findService(query);
		const logger = await this.storage.getLogsById(service._id, service.log_level);

		try {
			const response = await runWebService(this.context, this.storage, req.user, query, xyz);
			logger.debug(`Streaming tile ${xyz.join("/")} to client`);
			let contentType = 'application/octet-stream';
			if (typeof response.headers['content-type'] !== 'undefined') {
				contentType = response.headers['content-type'];
			}
			res.header('Content-Type', contentType);
			response.data.pipe(res);
		} catch(e) {
			logger.error(e);
			throw e;
		}
	}

	async getServices(req, res) {
		this.init(req);

		const query = {
			user_id: req.user._id
		};
		const db = this.storage.database();
		const services = await db.findAsync(query);
		res.json({
			services: services.map(service => this.makeServiceResponse(service, false)),
			links: []
		});
	}

	async deleteService(req, res) {
		this.init(req);

		const query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		const db = this.storage.database();
		const numDeleted = await db.removeAsync(query);
		if (numDeleted === 0) {
			throw new Errors.ServiceNotFound();
		}

		try {
			await this.storage.removeLogsById(req.params.service_id);
		} catch (e) {
			if (this.context.debug) {
				console.error(e);
			}
		}

		res.send(204);
	}

	async patchService(req, res) {
		this.init(req);

		if (!Utils.isObject(req.body)) {
			throw new Errors.RequestBodyMissing();
		}

		const query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		const db = this.storage.database();
		const service = await db.findOneAsync(query);
		if (service === null) {
			throw new Errors.ServiceNotFound();
		}

		const data = {};
		const promises = [];
		for(const key in req.body) {
			if (this.storage.isFieldEditable(key)) {
				switch(key) {
					case 'process': {
						const pg = new ProcessGraph(req.body.process, this.context.processingContext(req.user));
						// ToDo 1.0: Correctly handle service paramaters #79
						pg.allowUndefinedParameters(false);
						promises.push(pg.validate());
						break;
					}
					case 'type':
						promises.push(async () => {
							if (!this.context.isValidServiceType(req.body.type)) {
								throw new Errors.ServiceUnsupported();
							}
						});
						break;
					default:
						// ToDo: Validate further data  #73
						// For example, if budget < costs, reject request
				}
				data[key] = req.body[key];
			}
			else {
				throw new Errors.PropertyNotEditable({property: key});
			}
		}

		if (Utils.size(data) === 0) {
			throw new Errors.NoDataForUpdate();
		}

		await Promise.all(promises);

		const { numAffected } = await db.updateAsync(query, { $set: data });
		if (numAffected === 0) {
			throw new Errors.Internal({message: 'Number of changed services was zero.'});
		}

		res.send(204);

		const logger = await this.storage.getLogsById(req.params.service_id, data.log_level || service.log_level);
		logger.info('Service updated', data);
	}

	async getServiceById(req) {
		const query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		const db = this.storage.database();
		const service = await db.findOneAsync(query);
		if (service === null) {
			throw new Errors.ServiceNotFound();
		}
		return service;
	}

	async getService(req, res) {
		this.init(req);
		const service = await this.getServiceById(req);
		res.json(this.makeServiceResponse(service));
	}

	async postService(req, res) {
		this.init(req);

		if (!Utils.isObject(req.body)) {
			throw new Errors.RequestBodyMissing();
		}
		else if (!this.context.isValidServiceType(req.body.type)) {
			throw new Errors.ServiceUnsupported();
		}

		const pg = new ProcessGraph(req.body.process, this.context.processingContext(req.user));
		// ToDo 1.0: Correctly handle service paramaters #79
		pg.allowUndefinedParameters(false);
		await pg.validate();

		// ToDo: Validate further data  #73
		const data = {
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
			user_id: req.user._id,
			log_level: Logs.checkLevel(req.body.log_level, this.context.defaultLogLevel)
		};
		const db = this.storage.database();
		const service = await db.insertAsync(data);

		// Create logs at creation time to avoid issues described in #51
		await this.storage.getLogsById(service._id, service.log_level);

		res.header('OpenEO-Identifier', service._id);
		res.redirect(201, API.getUrl('/services/' + service._id), Utils.noop);
	}

	async getServiceLogs(req, res) {
		this.init(req);
		const service = await this.getServiceById(req);
		const manager = await this.storage.getLogsById(service._id, service.log_level);
		const logs = await manager.get(req.query.offset, req.query.limit, req.query.level);
		res.json(logs);
	}

	makeServiceResponse(service, full = true) {
		const response = {
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
		return API.getUrl('/' + service.type.toLowerCase() + '/' + service._id + "/{z}/{x}/{y}");
	}

}
