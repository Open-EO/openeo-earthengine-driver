const axios = require('axios');
const Utils = require('../utils');
const fse = require('fs-extra');
const path = require('path');
const Errors = require('../errors');

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

		server.createSubscriptions(['openeo.jobs.debug']);

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
				return next(new Errors.Internal(e));
			});
			stream.on('close', () => {
				res.end();
				return next();
			});
		})
		.catch(err => next(new Errors.wrap(err)));
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
				return next(new Errors.Internal(err));
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
				return next(new Errors.Internal(err));
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

		var filePath;
		this.storage.findJob(query)
		.then(job => {
			if (job.status === 'queued' || job.status === 'running') {
				throw new Errors.JobNotFinished();
			}

			return this.storage.removeResults(job._id)
			.then(() => this.storage.updateJobStatus(query, 'queued'))
			.then(() => {
				this.sendDebugNotifiction(req, res, "Queueing batch job");

				res.send(202);
				next();

				var runner = this.context.runner(job.process_graph);
				var context = runner.createContextFromRequest(req);
				return runner.validate(context)
					.then(() => runner.execute(context))
					.then(resultNode => {
						var cube = resultNode.getResult();
						var jobFormat = context.translateOutputFormat(cube.getOutputFormat());
						filePath = this.storage.getJobFile(job._id, Utils.generateHash() +  "." + jobFormat);
						return context.retrieveResults(cube);
					})
					.catch(e => next(Errors.wrap(e)));
			});
		})
		.then(url => {
			this.sendDebugNotifiction(req, res, "Downloading " + url);
			this.storage.updateJobStatus(query, 'running').catch(() => {});
			return axios({
				method: 'get',
				url: url,
				responseType: 'stream'
			});
		})
		.then(stream => {
			this.sendDebugNotifiction(req, res, "Download finished, storing result to " + filePath);
			return fse.ensureDir(path.dirname(filePath))
				.then(() => new Promise((resolve, reject) => {
					var writer = fse.createWriteStream(filePath);
					stream.data.pipe(writer);
					writer.on('error', (e) => {
						reject(new Errors.Internal(e));
					});
					writer.on('close', () => {
						resolve();
					});
				}));
		})
		.then(() => this.storage.updateJobStatus(query, 'finished'))
		.catch(e => {
			this.storage.updateJobStatus(query, 'error', e);
			this.sendDebugNotifiction(req, res, e);
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
				res.send(424, job.error);
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
					var links = [];
					for(var i in files) {
						var file = files[i].path;
						var fileName = path.relative(folder, file);
						var mediaType = Utils.extensionToMediaType(fileName);
						links.push({
							href: Utils.getApiUrl("/storage/" + job._id + "/" + fileName),
							type: mediaType
						});
					}
					res.send({
						id: job._id,
						title: job.title,
						description: job.description,
						updated: job.updated,
						links: links
					});
					next();
				});
		})
		.catch(e => next(Errors.wrap(e)));
	}

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
			this.context.subscriptions().publish(req.user._id, "openeo.jobs.debug", params, payload);
			if (this.context.debug) {
				console.log(params.job_id + ": " + message);
			}
		} catch (e) {
			console.log(e);
		}
	}

	patchJob(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
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
						case 'process_graph':
							var runner = this.context.runner(req.body.process_graph);
							promises.push(runner.validateRequest(req));
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
	}

	postJob(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}

		var runner = this.context.runner(req.body.process_graph);
		runner.validateRequest(req).then(() => {
			// ToDo: Validate data
			var data = {
				title: req.body.title || null,
				description: req.body.description || null,
				process_graph: req.body.process_graph,
				status: "submitted",
				submitted: Utils.getISODateTime(),
				updated: Utils.getISODateTime(),
				plan: req.body.plan || this.context.plans.default,
				costs: 0,
				budget: req.body.budget || null,
				user_id: req.user._id
			};
			this.storage.database().insert(data, (err, job) => {
				if (err) {
					next(new Errors.Internal(err));
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

		if (typeof req.body !== 'object' || !Utils.isObject(req.body.process_graph) || Utils.size(req.body.process_graph) === 0) {
			return next(new Errors.ProcessGraphMissing());
		}

		let plan = req.body.plan || this.context.plans.default;
		let budget = req.body.budget || null;
		// ToDo: Validate data, handle budget and plan input

		this.sendDebugNotifiction(req, res, "Starting to process request");

		var runner = this.context.runner(req.body.process_graph);
		var context = runner.createContextFromRequest(req);
		runner.validate(context, false)
			.then(errorList => {
				this.sendDebugNotifiction(req, res, "Validated with " + errorList.count() + " errors");
				if (errorList.count() > 0) {
					errorList.getAll().forEach(error => this.sendDebugNotifiction(req, res, error));
					throw errorList.first();
				}

				this.sendDebugNotifiction(req, res, "Executing processes");
				return runner.execute(context);
			})
			.then(resultNode => context.retrieveResults(resultNode.getResult(), 1000)) // 1000 = pixel size
			.then(url => {
				this.sendDebugNotifiction(req, res, "Downloading " + url);
				return axios({
					method: 'get',
					url: url,
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
			.catch(e => next(Errors.wrap(e)));
	}

	makeJobResponse(job, full = true) {
		var response = {
			id: job._id,
			title: job.title,
			description: job.description,
			status: job.status,
			error: job.error,
			submitted: job.submitted,
			updated: job.updated,
			plan: job.plan,
			costs: job.costs || 0,
			budget: job.budget || null
		};
		if (full) {
			response.process_graph = job.process_graph;
		}
		return response;
	}

};