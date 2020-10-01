const Utils = require('../utils');
const HttpUtils = require('../httpUtils');
const fse = require('fs-extra');
const path = require('path');
const Errors = require('../errors');
const ProcessGraph = require('../processgraph/processgraph');
const packageInfo = require('../../package.json');
const Logs = require('../models/logs');

module.exports = class JobsAPI {

	constructor(context) {
		this.storage = context.jobs();
		this.context = context;
	}

	beforeServerStart(server) {
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

		server.addEndpoint('get', '/temp/{token}/{file}', this.getTempFile.bind(this), false);
		server.addEndpoint('get', '/storage/{job_id}/{file}', this.getStorageFile.bind(this), false);

		return Promise.resolve();
	}

	getTempFile(req, res, next) {
		var p = this.storage.makeFolder(this.context.getTempFolder(), [req.params.token, req.params.file]);
		if (!p) {
			return next(new Errors.NotFound());
		}
		this.deliverFile(req, res, next, p);
	}

	getStorageFile(req, res, next) {
		var p = this.storage.makeFolder(this.storage.getFolder(), [req.params.job_id, req.params.file]);
		if (!p) {
			return next(new Errors.NotFound());
		}
		this.deliverFile(req, res, next, p);
	}

	deliverFile(req, res, next, path) {
		HttpUtils.isFile(path).then(() => {
			res.header('Content-Type', Utils.extensionToMediaType(path));
			var stream = fse.createReadStream(path);
			stream.pipe(res);
			stream.on('error', (e) => {
				return next(Errors.wrap(e));
			});
			stream.on('close', () => {
				res.end();
				return next();
			});
		})
		.catch(err => next(Errors.wrap(err)));
	}

	getJobs(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			user_id: req.user._id
		};
		this.storage.database().find(query, {}, (err, jobs) => {
			if (err) {
				return next(Errors.wrap(err));
			}
			else {
				jobs = jobs.map(job => this.makeJobResponse(job, false));
				res.json({
					jobs: jobs,
					links: []
				});
				return next();
			}
		});
	}

	getJob(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		this.storage.getById(req.params.job_id, req.user._id).then(job => {
			res.json(this.makeJobResponse(job));
			return next();
		})
		.catch(e => next(Errors.wrap(e)));
	}

	getJobLogs(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		this.storage.getLogsById(req.params.job_id)
		.then(logs => logs.get(req.query.offset, req.query.limit))
		.then(json => {
			res.json(json);
			return next();
		})
		.catch(e => next(Errors.wrap(e)));
	}

	async getResultLogs(user_id, id) {
		let file = path.normalize(path.join('./storage/user_files/', user_id, 'sync_logs' , id + '.logs.db'));
		let logs = new Logs(file, Utils.getApiUrl('/result/logs/' + id));
		await logs.init();
		return logs;
	}

	getSyncLogFile(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		this.getResultLogs(req.user._id, req.params.id)
			.then(logs => logs.get())
			.then(json => {
				res.json(json);
				return next();
			})
			.catch(() => next(new Errors.NotFound()));
	}

	deleteJob(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		this.storage.database().remove(query, {}, (err, numRemoved) => {
			if (err) {
				return next(Errors.wrap(err));
			}
			else if (numRemoved === 0) {
				return next(new Errors.JobNotFound());
			}
			else {
				this.storage.removeResults(req.params.job_id)
					.then(() => {
						res.send(204);
						return next();
					})
					.catch(e => next(Errors.wrap(e)));
			}
		});
	}

	postJobResults(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}

		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};

		var filePath, jobId, process, logger;
		this.storage.findJob(query)
		.then(job => {
			if (job.status === 'queued' || job.status === 'running') {
				throw new Errors.JobNotFinished();
			}

			jobId = job._id;
			process = job.process;
		})
		.then(() => this.storage.removeResults(jobId))
		.then(() => this.storage.getLogsById(jobId))
		.then(logs => {
			logger = logs;
			return logs.clear();
		})
		.then(() => {
			logger.info("Queueing batch job");
			this.storage.updateJobStatus(query, 'queued').catch(() => {});
		
			res.send(202);
			return next();
		})
		.then(() => {
			logger.info("Starting batch job");
			this.storage.updateJobStatus(query, 'running').catch(() => {});

			var context = this.context.processingContext(req);
			var pg = new ProcessGraph(process, context);
			pg.setLogger(logger);
			return pg.execute();
		})
		.then(resultNode => {
			var context = resultNode.getProcessGraph().getContext();
			var cube = resultNode.getResult();
			var extension = context.getExtension(cube.getOutputFormat());
			filePath = this.storage.getJobFile(jobId, Utils.generateHash() +  "." + extension);
			return context.retrieveResults(cube);
		})
		.then(url => {
			logger.debug("Downloading data from Google: " + url);
			return HttpUtils.stream({
				method: 'get',
				url: url,
				responseType: 'stream'
			});
		})
		.then(stream => {
			logger.debug("Storing result to: " + filePath);
			return fse.ensureDir(path.dirname(filePath))
				.then(() => new Promise((resolve, reject) => {
					var writer = fse.createWriteStream(filePath);
					stream.data.pipe(writer);
					writer.on('error', (e) => {
						reject(Errors.wrap(e));
					});
					writer.on('close', () => {
						resolve();
					});
				}));
		})
		.then(() => {
			logger.info("Finished");
			this.storage.updateJobStatus(query, 'finished');
		})
		.catch(e => {
			if(logger) {
				logger.error(e);
			}
			else {
				console.error(e);
			}
			this.storage.updateJobStatus(query, 'error');
		});
	}

	getJobResults(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}

		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};

		this.storage.findJob(query)
		.then(job => {
			if (job.status === 'error') {
				res.send(424, job.error); // ToDo 1.0: Send latest info from logging
				return next();
			}
			else if (job.status === 'queued' || job.status === 'running') {
				throw new Errors.JobNotFinished();
			}
			else if (job.status !== 'finished') {
				throw new Errors.JobNotStarted();
			}

			var folder = this.storage.getJobFolder(job._id);
			return Utils.walk(folder)
				.then(files => {
					var assets = {};
					for(var i in files) {
						var file = files[i].path;
						var fileName = path.relative(folder, file);
						assets[fileName] = {
							href: Utils.getApiUrl("/storage/" + job._id + "/" + fileName),
							rel: "data",
							type: Utils.extensionToMediaType(fileName)
						};
					}
					let item = {
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
						links: []
					};
					res.send(item);
					next();
				});
		})
		.catch(e => next(Errors.wrap(e)));
	}

	patchJob(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		else if (!Utils.isObject(req.body)) {
			return next(new Errors.RequestBodyMissing());
		}

		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		var data = {};
		this.storage.findJob(query).then(job => {
			if (job.status === 'queued' || job.status === 'running') {
				throw new Errors.JobLocked();
			}

			var promises = [];
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
					return next(new Errors.PropertyNotEditable({property: key}));
				}
			}

			if (Utils.size(data) === 0) {
				return next(new Errors.NoDataForUpdate());
			}

			return Promise.all(promises).then(() => data);
		})
		.then(data => {
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
			return this.storage.getLogsById(req.params.job_id);
		})
		.then(logger => logger.info('Job updated', data))
		.catch(e => next(Errors.wrap(e)));
	}

	postJob(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		else if (!Utils.isObject(req.body)) {
			return next(new Errors.RequestBodyMissing());
		}

		var pg = new ProcessGraph(req.body.process, this.context.processingContext(req));
		pg.allowUndefinedParameters(false);
		pg.validate().then(() => {
			// ToDo: Validate data
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
				user_id: req.user._id
			};
			this.storage.database().insert(data, (err, job) => {
				if (err) {
					next(Errors.wrap(err));
				}
				else {
					// Create logs at creation time to avoid issues described in #51 
					this.storage.getLogsById(job._id).then(() => {
						res.header('OpenEO-Identifier', job._id);
						res.redirect(201, Utils.getApiUrl('/jobs/' + job._id), next);
					}).catch(e => next(e));
				}
			});
		})
		.catch(e => next(Errors.wrap(e)));
	}

	postSyncResult(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		else if (!Utils.isObject(req.body)) {
			return next(new Errors.RequestBodyMissing());
		}

		let plan = req.body.plan || this.context.plans.default;
		let budget = req.body.budget || null;
		// ToDo: Validate data, handle budget and plan input

		let id = Utils.timeId();
		let context, logger, pg;
		this.getResultLogs(req.user._id, id)
			.then(logs => {
				logger = logs;
				logger.debug("Starting to process request");
				context = this.context.processingContext(req);
				pg = new ProcessGraph(req.body.process, context);
				pg.setLogger(logger);
				pg.allowUndefinedParameters(false);
				return pg.validate(false);
			})
			.then(errorList => {
				if (errorList.count() > 0) {
					errorList.getAll().forEach(error => logger.error(error));
					throw errorList.first();
				}
				else {
					logger.info("Validated without errors");
				}
				logger.debug("Executing processes");
				return pg.execute();
			})
			.then(resultNode => context.retrieveResults(resultNode.getResult()))
			.then(url => {
				logger.debug("Downloading data from Google: " + url);
				return HttpUtils.stream({
					method: 'get',
					url: url,
					responseType: 'stream'
				});
			})
			.then(stream => {
				var contentType = typeof stream.headers['content-type'] !== 'undefined' ? stream.headers['content-type'] : 'application/octet-stream';
				res.header('Content-Type', contentType);
				res.header('OpenEO-Costs', 0);
				var monitorUrl = Utils.getApiUrl('/result/logs/' + id);
				res.header('Link', `<${monitorUrl}>; rel="monitor"`);
				stream.data.pipe(res);
				return next();
			})
			.catch(e => {
				// ToDo: Check for error in response.
				next(Errors.wrap(e));
			});
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
		}
		return response;
	}

};