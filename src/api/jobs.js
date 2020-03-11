const Utils = require('../utils');
const fse = require('fs-extra');
const path = require('path');
const Errors = require('../errors');
const ProcessGraph = require('../processgraph/processgraph');
const packageInfo = require('../../package.json');

module.exports = class JobsAPI {

	constructor(context) {
		this.storage = context.jobs();
		this.context = context;
	}

	beforeServerStart(server) {
		server.addEndpoint('post', '/result', this.postSyncResult.bind(this));

		server.addEndpoint('post', '/jobs', this.postJob.bind(this));
		server.addEndpoint('get', '/jobs', this.getJobs.bind(this));
		server.addEndpoint('get', '/jobs/{job_id}', this.getJob.bind(this));
		server.addEndpoint('patch', '/jobs/{job_id}', this.patchJob.bind(this));
		server.addEndpoint('delete', '/jobs/{job_id}', this.deleteJob.bind(this));

		server.addEndpoint('get', '/jobs/{job_id}/results', this.getJobResults.bind(this));
		server.addEndpoint('post', '/jobs/{job_id}/results', this.postJobResults.bind(this));
		// It's currently not possible to cancel job processing as we can't interrupt the POST request to GEE.
		// We could use https://github.com/axios/axios#cancellation in the future

		server.addEndpoint('get', '/temp/{token}/{file}', this.getTempFile.bind(this));
		server.addEndpoint('get', '/storage/{job_id}/{file}', this.getStorageFile.bind(this));

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
		Utils.isFile(path).then(() => {
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

		var filePath, jobId;
		this.storage.findJob(query)
		.then(job => {
			if (job.status === 'queued' || job.status === 'running') {
				throw new Errors.JobNotFinished();
			}
			jobId = job._id;

			this.sendDebugNotifiction(req, res, "Queueing batch job");
			this.storage.updateJobStatus(query, 'queued').catch(() => {});
			this.storage.removeResults(job._id);
		
			res.send(202);
			next();

			this.sendDebugNotifiction(req, res, "Starting batch job");
			this.storage.updateJobStatus(query, 'running').catch(() => {});

			var context = this.context.processingContext(req);
			var pg = new ProcessGraph(job.process, context);
			return pg.execute();
		})
		.then(resultNode => {
			var context = resultNode.getProcessGraph().getContext();
			var cube = resultNode.getResult();
			var jobFormat = context.translateOutputFormat(cube.getOutputFormat());
			filePath = this.storage.getJobFile(jobId, Utils.generateHash() +  "." + jobFormat);
			return context.retrieveResults(cube, null, jobId);
		})
		.then(urls => {
			var promises = [];
			for(var url of urls) {
				this.sendDebugNotifiction(req, res, "Downloading data from Google: " + url);
				p = Utils.stream({
					method: 'get',
					url: url,
					responseType: 'stream'
				}).then(stream => {
					this.sendDebugNotifiction(req, res, "Storing result for " + url + " to: " + filePath);
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
				});
				promises.push(p);
			}
			return Promise.all(promises);
		})
		.then(() => {
			this.sendDebugNotifiction(req, res, "Finished");
			this.storage.updateJobStatus(query, 'finished')
		})
		.catch(e => {
			if (!(e instanceof Errors.JobNotFinished)) {
				this.storage.updateJobStatus(query, 'error', e);
				this.sendDebugNotifiction(req, res, e);
			}
			next(Errors.wrap(e));
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
					res.send({
						stac_version: packageInfo.stac_version,
						stac_extensions: [],
						id: job._id,
						type: "Feature",
						bbox: null, // ToDo 1.0: Set correct bbox
						geometry: null, // ToDo 1.0: Set correct geometry
						properties: {
							datetime: null, // ToDo 1.0: Set correct datetimes
							start_datetime: null,
							end_datetime: null,
							title: job.title || null,
							description: job.description || null,
							created: job.created,
							updated: job.updated
						},
						assets: assets,
						links: []
					});
					next();
				});
		})
		.catch(e => next(Errors.wrap(e)));
	}

	// Redirect to log file instead of using notifications
	sendDebugNotifiction(req, res, message, processName = null, processParams = {}) {
		try {
			var params = {
				job_id: req.params.job_id || "synchronous-result"
			};
			var payload = {
				message: message,
			};
			if (processName !== null) {
				payload.process = {
					name: processName,
					parameters: processParams
				};
			}
			if (this.context.debug) {
				console.log(params.job_id + ": " + message);
			}
		} catch (e) {
			console.error(e);
		}
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
		this.storage.findJob(query).then(job => {
			if (job.status === 'queued' || job.status === 'running') {
				throw new Errors.JobLocked();
			}

			var data = {};
			var promises = [];
			for(let key in req.body) {
				if (this.storage.isFieldEditable(key)) {
					switch(key) {
						case 'process':
							var pg = new ProcessGraph(req.body.process, this.context.processingContext(req));
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
		})
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
					res.header('OpenEO-Identifier', job._id);
					res.redirect(201, Utils.getApiUrl('/jobs/' + job._id), next);
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
	
		this.sendDebugNotifiction(req, res, "Starting to process request");

		var context = this.context.processingContext(req);
		var pg = new ProcessGraph(req.body.process, context);
		pg.validate(false)
			.then(errorList => {
				this.sendDebugNotifiction(req, res, "Validated with " + errorList.count() + " errors");
				if (errorList.count() > 0) {
					errorList.getAll().forEach(error => this.sendDebugNotifiction(req, res, error));
					throw errorList.first();
				}
				this.sendDebugNotifiction(req, res, "Executing processes");
				return pg.execute();
			})
			.then(resultNode => context.retrieveResults(resultNode.getResult()))
			.then(urls => {
				this.sendDebugNotifiction(req, res, "Downloading data from Google: " + urls[0]);
				return Utils.stream({
					method: 'get',
					url: urls[0],
					responseType: 'stream'
				});
			})
			.then(stream => {
				var contentType = typeof stream.headers['content-type'] !== 'undefined' ? stream.headers['content-type'] : 'application/octet-stream';
				res.header('Content-Type', contentType);
				res.header('OpenEO-Costs', 0);
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