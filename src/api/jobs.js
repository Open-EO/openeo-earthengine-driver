const Utils = require('../utils/utils');
const HttpUtils = require('../utils/http');
const fse = require('fs-extra');
const path = require('path');
const Errors = require('../utils/errors');
const ProcessGraph = require('../processgraph/processgraph');
const packageInfo = require('../../package.json');
const Logs = require('../models/logs');

module.exports = class JobsAPI {

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
		// It's currently not possible to cancel job processing as we can't interrupt the POST request to GEE.
		// We could use https://github.com/axios/axios#cancellation in the future

		server.addEndpoint('get', '/results/{token}', this.getJobResultsByToken.bind(this));
		server.addEndpoint('get', '/temp/{token}/{file}', this.getTempFile.bind(this), false);
		server.addEndpoint('get', '/storage/{job_id}/{file}', this.getStorageFile.bind(this), false);
	}

	async getTempFile(req, res) {
		var p = this.storage.makeFolder(this.context.getTempFolder(), [req.params.token, req.params.file]);
		if (!p) {
			throw new Errors.NotFound();
		}
		await this.deliverFile(res, p);
	}

	async getStorageFile(req, res) {
		var p = this.storage.makeFolder(this.storage.getFolder(), [req.params.job_id, req.params.file]);
		if (!p) {
			throw new Errors.NotFound();
		}
		await this.deliverFile(res, p);
	}

	async deliverFile(res, path) {
		await HttpUtils.isFile(path);
		
		res.header('Content-Type', Utils.extensionToMediaType(path));
		return await new Promise((resolve, reject) => {
			var stream = fse.createReadStream(path);
			stream.pipe(res);
			stream.on('error', reject);
			stream.on('close', () => {
				res.end();
				resolve();
			});
		});
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
		// ToDo 1.2: Added level parameter to requests to set the minimum log level returned by the response. #485
		// ToDo 1.2: Added level property in responses to reflect the minimum log level that may appear in the response. #329
		this.init(req);
		
		const manager = await this.storage.getLogsById(req.params.job_id);
		const logs = await manager.get(req.query.offset, req.query.limit);
		res.json(logs);
	}

	async getResultLogs(user_id, id) {
		let file = path.normalize(path.join('./storage/user_files/', user_id, 'sync_logs' , id + '.logs.db'));
		let logs = new Logs(file, Utils.getApiUrl('/result/logs/' + id));
		await logs.init();
		return logs;
	}

	async getSyncLogFile(req, res) {
		this.init(req);

		try {
			// ToDo 1.2: Added level property in responses to reflect the minimum log level that may appear in the response. #329
			const logs = await this.getResultLogs(req.user._id, req.params.id);
			res.json(await logs.get());
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
		const numRemoved = db.removeAsync(query);
		if (numRemoved === 0) {
			throw new Errors.JobNotFound();
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

		let logger = console;
		try {

			const job = await this.storage.findJob(query);
			if (job.status === 'queued' || job.status === 'running') {
				throw new Errors.JobNotFinished();
			}

			logger = await this.storage.getLogsById(job._id);

			const promises = [];
			promises.push(this.storage.removeResults(job._id, false));
			promises.push(logger.clear());
			await Promise.all(promises);

			logger.info("Queueing batch job");
			await this.storage.updateJobStatus(query, 'queued');
		
			res.send(202);

			// ToDo sync: move all the following to a worker
			logger.info("Starting batch job");
			await this.storage.updateJobStatus(query, 'running');

			const context = this.context.processingContext(req);
			var pg = new ProcessGraph(job.process, context);
			pg.setLogger(logger);

			const resultNode = await pg.execute();

			const cube = resultNode.getResult();
			const url = await context.retrieveResults(cube);

			logger.debug("Downloading data from Google: " + url);
			const stream = await HttpUtils.stream({
				method: 'get',
				url: url,
				responseType: 'stream'
			});
				
			const extension = context.getExtension(cube.getOutputFormat());
			const filePath = this.storage.getJobFile(job._id, Utils.generateHash() +  "." + extension);
			logger.debug("Storing result to: " + filePath);
			await fse.ensureDir(path.dirname(filePath));
			await new Promise((resolve, reject) => {
				const writer = fse.createWriteStream(filePath);
				stream.data.pipe(writer);
				writer.on('error', reject);
				writer.on('close', resolve);
			});
			
			logger.info("Finished");
			this.storage.updateJobStatus(query, 'finished');
		} catch(e) {
			logger.error(e);
			this.storage.updateJobStatus(query, 'error');
			throw e;
		}
	}

	async getJobResultsByToken(req, res) {
		var query = {
			token: req.params.token
		};

		await this.getJobRultsByQuery(query, true, res);
	}

	async getJobResults(req, res) {
		// ToDo 1.2:
		// Added metadata field openeo:status to indicate the job status (and whether the result is complete or not).
		// Added parameter partial to allow retrieving incomplete results, which must also add the new property openeo:status to the metadata. #430
		this.init(req);

		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		await this.getJobRultsByQuery(query, false, res);
	}

	async getJobRultsByQuery(query, pub, res) {
		const job = await this.storage.findJob(query);
		if (job.status === 'error') {
			return res.send(424, job.error); // ToDo 1.0: Send latest info from logging
		}
		else if (job.status === 'queued' || job.status === 'running') {
			throw new Errors.JobNotFinished();
		}
		else if (job.status !== 'finished') {
			throw new Errors.JobNotStarted();
		}

		const folder = this.storage.getJobFolder(job._id);
		const files = await Utils.walk(folder);
		const links = [
			{
				href: Utils.getApiUrl("/results/" + job.token),
				rel: 'canonical',
				type: 'application/json'
			}
		];
		const assets = {};
		for(const file of files) {
			const fileName = path.relative(folder, file.path);
			const href = Utils.getApiUrl("/storage/" + job._id + "/" + fileName);
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
					type: type
				};
			}
		}
		const item = {
			stac_version: packageInfo.stac_version,
			stac_extensions: [],
			id: job._id,
			type: "Feature",
			geometry: null, // ToDo 1.0: Set correct geometry, add bbox if geometry is set
			properties: {
				datetime: null, // ToDo 1.0: Set correct datetimes
				title: job.title || null,
				description: job.description || null,
				created: job.created,
				updated: job.updated
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
		for(let key in req.body) {
			if (this.storage.isFieldEditable(key)) {
				switch(key) {
					case 'process':
						var pg = new ProcessGraph(req.body.process, this.context.processingContext(req));
						pg.allowUndefinedParameters(false);
						promises.push(pg.validate());
						break;
					default:
						// ToDo: Validate further data
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
		const { numAffected } = db.updateAsync(query, { $set: data });
		if (numAffected === 0) {
			throw new Errors.Internal({message: 'Number of changed elements was 0.'});
		}
		res.send(204);

		const logger = this.storage.getLogsById(req.params.job_id);
		logger.info('Job updated', data);
	}

	async postJob(req, res) {
		// ToDo 1.2: Added property log_level to indicate the minimum severity level that should be stored for logs. #329
		this.init(req);

		if (!Utils.isObject(req.body)) {
			throw new Errors.RequestBodyMissing();
		}

		var pg = new ProcessGraph(req.body.process, this.context.processingContext(req));
		pg.allowUndefinedParameters(false);
		await pg.validate();

		// ToDo: Validate further data
		var data = {
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
			token: Utils.generateHash(64)
		};
		const db = this.storage.database();
		const job = await db.insertAsync(data);

		// Create logs at creation time to avoid issues described in #51 
		await this.storage.getLogsById(job._id);

		res.header('OpenEO-Identifier', job._id);
		res.redirect(201, Utils.getApiUrl('/jobs/' + job._id), Utils.noop);
	}

	async postSyncResult(req, res) {
		// ToDo 1.2: Added property log_level to indicate the minimum severity level that should be stored for logs. #329
		this.init(req);

		if (!Utils.isObject(req.body)) {
			throw new Errors.RequestBodyMissing();
		}

		const plan = req.body.plan || this.context.plans.default;
		const budget = req.body.budget || null;
		// ToDo: Validate data, handle budget and plan input

		const id = Utils.timeId();

		const logger = await this.getResultLogs(req.user._id, id);
		logger.debug("Starting to process request");

		const context = this.context.processingContext(req);
		const pg = new ProcessGraph(req.body.process, context);
		pg.setLogger(logger);
		pg.allowUndefinedParameters(false);
		const errorList = await pg.validate(false);
		if (errorList.count() > 0) {
			errorList.getAll().forEach(error => logger.error(error));
			throw errorList.first();
		}
		else {
			logger.info("Validated without errors");
		}

		logger.debug("Executing processes");
		const resultNode = await pg.execute();
		const url = await context.retrieveResults(resultNode.getResult());

		logger.debug("Downloading data from Google: " + url);
		const stream = await HttpUtils.stream({
			method: 'get',
			url: url,
			responseType: 'stream'
		});

		const contentType = typeof stream.headers['content-type'] !== 'undefined' ? stream.headers['content-type'] : 'application/octet-stream';
		res.header('Content-Type', contentType);
		res.header('OpenEO-Costs', 0);
		const monitorUrl = Utils.getApiUrl('/result/logs/' + id);
		res.header('Link', `<${monitorUrl}>; rel="monitor"`);
		stream.data.pipe(res);
	}

	makeJobResponse(job, full = true) {
		var response = {
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

};