import API from '../utils/API.js';
import Utils from '../utils/utils.js';
import HttpUtils from '../utils/http.js';
import path from 'path';
import Errors from '../utils/errors.js';
import ProcessGraph from '../processgraph/processgraph.js';
import Logs from '../models/logs.js';
import runBatchJob from './worker/batchjob.js';
import runSync, { getResultLogs } from './worker/sync.js';
const packageInfo = Utils.require('../../package.json');

export default class JobsAPI {

	constructor(context) {
		this.storage = context.jobs();
		this.context = context;
	}

	async beforeServerStart(server) {
		server.addEndpoint('post', '/result', this.postSyncResult.bind(this));
		server.addEndpoint('get', '/result/logs/{id}', this.getSyncLogFile.bind(this), false);

		server.addEndpoint('post', '/jobs', this.postJob.bind(this));
		server.addEndpoint('get', '/jobs', this.getJobs.bind(this));
		server.addEndpoint('get', '/jobs/{job_id}', this.getJob.bind(this));
		server.addEndpoint('patch', '/jobs/{job_id}', this.patchJob.bind(this));
		server.addEndpoint('delete', '/jobs/{job_id}', this.deleteJob.bind(this));

		server.addEndpoint('get', '/jobs/{job_id}/logs', this.getJobLogs.bind(this));
		server.addEndpoint('get', '/jobs/{job_id}/results', this.getJobResults.bind(this));
		server.addEndpoint('post', '/jobs/{job_id}/results', this.postJobResults.bind(this));
		server.addEndpoint('delete', '/jobs/{job_id}/results', this.deleteJobResults.bind(this));

		server.addEndpoint('get', '/results/{token}', this.getJobResultsByToken.bind(this), false);
		server.addEndpoint('get', '/storage/{token}/{file}', this.getStorageFile.bind(this), false);
	}

	async getStorageFile(req, res) {
		const job = await this.storage.findJob({
			token: req.params.token
		});
		const p = this.storage.makeFolder(this.storage.getFolder(), [job._id, req.params.file]);
		if (!p) {
			throw new Errors.NotFound();
		}
		await this.deliverFile(res, p);
	}

	async deliverFile(res, filepath) {
		await HttpUtils.isFile(filepath);
		await HttpUtils.sendFile(filepath, res);
	}

	init(req) {
		if (!req.user._id) {
			throw new Errors.AuthenticationRequired();
		}
	}

	async getJobs(req, res) {
		this.init(req);

		const query = {
			user_id: req.user._id
		};
		const db = this.storage.database();
		const jobs = (await db.findAsync(query))
			.map(job => this.makeJobResponse(job, false));

		res.json({
			jobs: jobs,
			links: []
		});
	}

	async getJob(req, res) {
		this.init(req);

		const job = await this.storage.getById(req.params.job_id, req.user._id);
		res.json(this.makeJobResponse(job));
	}

	async getJobLogs(req, res) {
		this.init(req);
		const job = await this.storage.getById(req.params.job_id, req.user._id);
		const manager = await this.storage.getLogsById(req.params.job_id, job.log_level);
		const logs = await manager.get(req.query.offset, req.query.limit, req.query.level);
		res.json(logs);
	}

	async getSyncLogFile(req, res) {
		this.init(req);

		try {
			const logs = await getResultLogs(req.user._id, req.params.id, req.query.log_level);
			res.json(await logs.get(null, 0));
		} catch (e) {
			throw new Errors.NotFound();
		}
	}

	async deleteJob(req, res) {
		this.init(req);

		const query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		const db = this.storage.database();
		const numRemoved = await db.removeAsync(query);
		if (numRemoved === 0) {
			throw new Errors.JobNotFound({identifier: req.params.job_id});
		}
		else {
			await this.storage.removeResults(req.params.job_id);
			res.send(204);
		}
	}

	async postJobResults(req, res) {
		this.init(req);

		const query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};

		const job = await this.storage.findJob(query);
		if (job.status === 'queued' || job.status === 'running') {
			throw new Errors.JobNotFinished();
		}

		const logger = await this.storage.getLogsById(job._id, job.log_level);
		logger.info("Queueing batch job");
		await this.storage.updateJobStatus(query, 'queued');

		res.send(202);

		await runBatchJob(this.context, this.storage, this.user, query);
	}

	async getJobResultsByToken(req, res) {
		const query = {
			token: req.params.token
		};

		await this.getJobRultsByQuery(query, true, req, res);
	}

	async getJobResults(req, res) {
		this.init(req);

		const query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		await this.getJobRultsByQuery(query, false, req, res);
	}

	async deleteJobResults(req, res) {
		this.init(req);

		const query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};

		const job = await this.storage.findJob(query);
		if (job.status === 'queued' || job.status === 'running') {
			const newStatus = job.status === 'queued' ? 'created' : 'canceled';
			await this.storage.updateJobStatus(query, newStatus);
		}

		// todo: actually stop the processing

		res.send(204);
	}

	async getJobRultsByQuery(query, pub, req, res) {
		const job = await this.storage.findJob(query);
		const partial = typeof req.query.partial !== 'undefined';
		if (job.status === 'error') {
			const manager = await this.storage.getLogsById(job._id, job.log_level);
			const logs = await manager.get(null, 1, 'error');
			let error = new Errors.Internal({message: 'Unknown failure'});
			if (Array.isArray(logs.logs) && logs.logs.length > 0) {
				error = logs.logs[0];
			}
			return res.send(424, error);
		}
		else if (job.status === 'queued' || job.status === 'running') {
			if (partial) {
				throw new Errors.QueryParameterUnsupported({name: 'partial'});
			}
			else {
				throw new Errors.JobNotFinished();
			}
		}
		else if (job.status !== 'finished') {
			throw new Errors.JobNotStarted();
		}

		const folder = this.storage.getJobFolder(job._id);
		const files = await Utils.walk(folder);
		const links = [
			{
				href: API.getUrl("/results/" + job.token),
				rel: 'canonical',
				type: 'application/json'
			}
		];
		const assets = {};
		for(const file of files) {
			const fileName = path.relative(folder, file.path);
			const href = API.getUrl("/storage/" + job.token + "/" + fileName);
			const type = Utils.extensionToMediaType(fileName);
			if (fileName === this.storage.logFileName) {
				if (!pub) {
					links.push({
						href: href,
						rel: 'monitor',
						type: type,
						title: 'Batch Job Log File'
					});
				}
			}
			else {
				assets[fileName] = {
					href: href,
					roles: ["data"],
					type: type,
					"file:size": file.stat.size,
					created: file.stat.birthtime,
					updated: file.stat.mtime
				};
			}
		}
		const item = {
			stac_version: packageInfo.stac_version,
			stac_extensions: [
				"https://stac-extensions.github.io/file/v2.0.0/schema.json",
			],
			id: job._id,
			type: "Feature",
			geometry: null,
			properties: {
				datetime: null,
				title: job.title || null,
				description: job.description || null,
				created: job.created,
				updated: job.updated,
				'openeo:status': job.status
			},
			assets: assets,
			links: links
		};
		res.send(item);
	}

	async patchJob(req, res) {
		this.init(req);

		if (!Utils.isObject(req.body)) {
			throw new Errors.RequestBodyMissing();
		}

		const query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		const job = await this.storage.findJob(query);
		if (job.status === 'queued' || job.status === 'running') {
			throw new Errors.JobLocked();
		}

		const data = {};
		const promises = [];
		for(const key in req.body) {
			if (this.storage.isFieldEditable(key)) {
				switch(key) {
					case 'process': {
						const pg = new ProcessGraph(req.body.process, this.context.processingContext(req.user));
						pg.allowUndefinedParameters(false);
						promises.push(pg.validate());
						break;
					}
					default:
						// ToDo: Validate further data #73
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

		const db = this.storage.database();
		const { numAffected } = await db.updateAsync(query, { $set: data });
		if (numAffected === 0) {
			throw new Errors.Internal({message: 'Number of changed elements was 0.'});
		}
		res.send(204);

		const logger = await this.storage.getLogsById(req.params.job_id, data.log_level || job.log_level);
		logger.info('Job updated', data);
	}

	async postJob(req, res) {
		this.init(req);

		if (!Utils.isObject(req.body)) {
			throw new Errors.RequestBodyMissing();
		}

		const pg = new ProcessGraph(req.body.process, this.context.processingContext(req.user));
		pg.allowUndefinedParameters(false);
		await pg.validate();

		// ToDo: Validate further data #73
		const data = {
			title: req.body.title || null,
			description: req.body.description || null,
			process: req.body.process,
			status: "created",
			created: Utils.getISODateTime(),
			updated: Utils.getISODateTime(),
			plan: req.body.plan || this.context.plans.default,
			costs: 0,
			budget: req.body.budget || null,
			user_id: req.user._id,
			token: Utils.generateHash(64),
			log_level: Logs.checkLevel(req.body.log_level, this.context.defaultLogLevel)
		};
		const db = this.storage.database();
		const job = await db.insertAsync(data);

		// Create logs at creation time to avoid issues described in #51
		await this.storage.getLogsById(job._id, job.log_level);

		res.header('OpenEO-Identifier', job._id);
		res.redirect(201, API.getUrl('/jobs/' + job._id), Utils.noop);
	}

	async postSyncResult(req, res) {
		this.init(req);

		if (!Utils.isObject(req.body)) {
			throw new Errors.RequestBodyMissing();
		}

		// const plan = req.body.plan || this.context.plans.default;
		// const budget = req.body.budget || null;
		// ToDo: Validate data, handle budget and plan input #73
		const id = Utils.timeId();
    const log_level = Logs.checkLevel(req.body.log_level, this.context.defaultLogLevel);

		const response = await runSync(this.context, req.user, id, req.body.process, log_level);

		res.header('Content-Type', response?.headers?.['content-type'] || 'application/octet-stream');
		res.header('OpenEO-Costs', 0);
		const monitorUrl = API.getUrl('/result/logs/' + id) + '?log_level=' + log_level;
		res.header('Link', `<${monitorUrl}>; rel="monitor"`);
		response.data.pipe(res);
	}

	makeJobResponse(job, full = true) {
		const response = {
			id: job._id,
			title: job.title,
			description: job.description,
			status: job.status,
			created: job.created,
			updated: job.updated,
			plan: job.plan,
			costs: job.costs || 0,
			budget: job.budget || null
		};
		if (full) {
			response.process = job.process;
			response.links = [];
		}
		return response;
	}

}
