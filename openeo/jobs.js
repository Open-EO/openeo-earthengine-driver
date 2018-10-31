const axios = require('axios');
const ProcessRegistry = require('./processRegistry');
const Utils = require('./utils');
const fs = require('fs');
const path = require('path');
const Errors = require('./errors');
const ProcessUtils = require('./processUtils');

module.exports = class JobsAPI {

	constructor() {
		this.tempFolder = './storage/temp_files';
		this.db = Utils.loadDB('jobs');
		this.editableFields = ['title', 'description', 'process_graph', 'output', 'plan', 'budget'];
		this.readOnlyFields = ['job_id', 'status', 'submitted', 'updated', 'costs'];
	}

	beforeServerStart(server) {
		server.addEndpoint('post', '/preview', this.postPreview.bind(this));

		server.addEndpoint('post', '/jobs', this.postJob.bind(this));
		server.addEndpoint('get', '/jobs', this.getJobs.bind(this));
		server.addEndpoint('get', '/jobs/{job_id}', this.getJob.bind(this));
		server.addEndpoint('patch', '/jobs/{job_id}', this.patchJob.bind(this));
		server.addEndpoint('delete', '/jobs/{job_id}', this.deleteJob.bind(this));

		server.addEndpoint('get', '/jobs/{job_id}/results', this.getJobResults.bind(this)); // ToDo
		server.addEndpoint('post', '/jobs/{job_id}/results', this.postJobResults.bind(this)); // ToDo
		server.addEndpoint('delete', '/jobs/{job_id}/results', this.deleteJobResults.bind(this)); // ToDo

		server.addEndpoint('get', '/temp/{token}/{file}', this.getTempFile.bind(this));

		server.createSubscriptions(['openeo.jobs.debug']);

		return Promise.resolve();
	}

	getTempFile(req, res, next) {
		var p = path.normalize(path.join(this.tempFolder, req.params.token, req.params.file));
		if (p && p.startsWith(path.normalize(this.tempFolder)) && fs.existsSync(p) && fs.statSync(p).isFile()) {
			if (p.endsWith('.json')) {
				res.header('Content-Type', 'application/json');
			}
			var stream = fs.createReadStream(p);
			stream.pipe(res);
			stream.on('error', (e) => {
				return next(Errors.Internal(e));
			});
			stream.on('close', () => {
				res.end();
				return next();
			});
		}
		else {
			return next(Errors.NotFound());
		}
	}

	getJobs(req, res, next) {
		var query = {
			user_id: req.user._id
		};
		this.db.find(query, {}, (err, jobs) => {
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
		this.findJobForUserById(req.params.job_id, req.user._id).then(job => {
			res.json(this.makeJobResponse(job));
			return next();
		})
		.catch(e => next(Errors.wrap(e)));
	}

	deleteJob(req, res, next) {
		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		this.db.remove(query, {}, (err, numRemoved) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (numRemoved === 0) {
				return next(Errors.JobNotFound());
			}
			else {
				res.send(204);
				return next();
			}
		});
	}

	deleteJobResults(req, res, next) {
		// ToDo: This doesn't delete pre-computed data yet
		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		this.db.update(query, { $set: { status: 'canceled' } }, {}, function (err, numChanged) {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (numChanged === 0) {
				return next(new Errors.JobNotFound());
			}
			else {
				res.send(204);
				return next();
			}
		});
	}

	postJobResults(req, res, next) {
		// ToDo: This doesn't pre-compute data yet
		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		this.db.update(query, { $set: { status: 'finished' } }, {}, function (err, numChanged) {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (numChanged === 0) {
				return next(new Errors.JobNotFound());
			}
			else {
				res.send(202);
				return next();
			}
		});
	}

	findJob(query) {
		return new Promise((resolve, reject) => {
			this.db.findOne(query, {}, (err, job) => {
				if (err) {
					reject(new Errors.Internal(err));
				}
				else if (job === null) {
					reject(new Errors.JobNotFound());
				}
				else {
					resolve(job);
				}
			});
		});
	}

	findJobById(job_id) {
		return this.findJob({
			_id: job_id
		});
	}

	findJobForUserById(job_id, user_id) {
		return this.findJob({
			_id: job_id,
			user_id: user_id
		});
	}

	getJobResults(req, res, next) {
		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		this.db.findOne(query, {}, (err, job) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (job === null) {
				return next(new Errors.JobNotFound());
			}
			else if (job.status === 'queued' || job.status === 'running') {
				return next(new Errors.JobNotFinished());
			}
			else if (job.status === 'canceled') {
				return next(new Errors.JobNotStarted());
			}

			this.sendDebugNotifiction(req, res, "Starting to process download request");
			this.execute(req, res, job.process_graph, job.output).then(url => {
				this.sendDebugNotifiction(req, res, "Executed processes, result available at " + url);
				res.send({
					job_id: job._id,
					title: job.title,
					description: job.description,
					updated: job.updated,
					links: [
						{
							href: url
						}
					]
				});
				next();
			})
			.catch(e => {
				e = Errors.wrap(e);
				this.sendDebugNotifiction(req, res, e);
				next(e);
			});
		});
	}

	sendDebugNotifiction(req, res, message, processName = null, processParams = {}) {
		try {
			var params = {
				job_id: req.params.job_id
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
			req.api.subscriptions.publish(req, "openeo.jobs.debug", params, payload);
		} catch (e) {
			console.log(e);
		}
	}

	patchJob(req, res, next) {
		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		this.db.findOne(query, {}, (err, job) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (job === null) {
				return next(new Errors.JobNotFound());
			}
			else if (job.status === 'queued' || job.status === 'running') {
				return next(new Errors.JobLocked());
			}

			var data = {};
			var promises = [];
			for(let key in req.body) {
				if (this.editableFields.includes(key)) {
					switch(key) {
						case 'process_graph':
							promises.push(ProcessRegistry.validateProcessGraph(req, req.body.process_graph));
							break;
						case 'output':
							promises.push(new Promise((resolve, reject) => {
								if (Utils.isObject(req.body.output) && typeof req.body.output.format !== 'string') {
									reject(new Errors.FormatUnsupported());
								}
								resolve();
							}));
							break;
						default:
							// ToDo: Validate further data
							// For example, if budget < costs, reject request
					}
					data[key] = req.body[key];
				}
				else if (this.readOnlyFields.includes(key)) {
					return next(new Errors.PropertyNotEditable({property: key}));
				}
				else {
					// Ignore unknown properties
				}
			}

			if (Utils.size(data) === 0) {
				return next(new Errors.NoDataForUpdate());
			}

			Promise.all(promises).then(() => {
				this.db.update(query, { $set: data }, {}, function (err, numChanged) {
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
		});
	}

	postJob(req, res, next) {
		let output = {
			format: req.config.outputFormats.default,
			parameters: {}
		};
		if (Utils.isObject(req.body.output) && typeof req.body.output.format === 'string') {
			if (req.config.isValidOutputFormat(req.body.output.format)) {
				output.format = req.body.output.format;
				// ToDo: We don't support any parameters yet, take and check input from req.body.output.parameters
			} else {
				return next(new Errors.FormatUnsupported());
			}
		}

		ProcessRegistry.validateProcessGraph(req, req.body.process_graph).then(() => {
			// ToDo: Validate data
			var data = {
				title: req.body.title || null,
				description: req.body.description || null,
				process_graph: req.body.process_graph,
				output: output,
				status: "submitted",
				submitted: Utils.getISODateTime(),
				updated: Utils.getISODateTime(),
				plan: req.body.plan || req.config.plans.default,
				costs: 0,
				budget: req.body.budget || null,
				user_id: req.user._id
			};
			this.db.insert(data, (err, job) => {
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

	postPreview(req, res, next) {
		if (!Utils.isObject(req.body.process_graph) || Utils.size(req.body.process_graph) === 0) {
			return next(Errors.ProcessGraphMissing());
		}

		let plan = req.body.plan || req.config.plans.default;
		let budget = req.body.budget || null;
		// ToDo: Validate data, handle budget and plan input
	
		this.sendDebugNotifiction(req, res, "Starting to process request");
		this.execute(req, res, req.body.process_graph, req.body.output).then(url => {
			this.sendDebugNotifiction(req, res, "Downloading " + url);
			console.log("Downloading " + url);
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
		.catch(e => {
			this.sendDebugNotifiction(req, res, e);
			next(Errors.wrap(e));
		});
	}

	makeJobResponse(job, full = true) {
		var response = {
			job_id: job._id,
			title: job.title,
			description: job.description,
			status: job.status,
			submitted: job.submitted,
			updated: job.updated,
			plan: job.plan,
			costs: job.costs || 0,
			budget: job.budget || null
		};
		if (job.budget)
		if (full) {
			response.process_graph = job.process_graph;
			if (job.output) {
				response.output = job.output;
			}
		}
		return response;
	}

	execute(req, res, processGraph, output) {
		// Check output format
		var format;
		if (Utils.isObject(output) && typeof output.format === 'string') {
			if (req.config.isValidOutputFormat(output.format)) {
				format = output.format;
				// ToDo: We don't support any parameters yet, take and check input from output.parameters
			} else {
				return Promise.reject(new Errors.FormatUnsupported());
			}
		}
		else {
			format = req.config.outputFormats.default;
		}

		// Execute graph
		// ToDo: global.downloadRegion a hack. Search for all occurances and remove them once a solution is available.
		global.downloadRegion = null;
		return ProcessRegistry.executeProcessGraph(req, processGraph).then(obj => {
			if (format.toLowerCase() !== 'json') {
				var image = ProcessUtils.toImage(obj, req);

				// Download image
				if (global.downloadRegion === null) {
	//				global.downloadRegion = image.geometry();
					throw new Errors.BoundingBoxMissing();
				}
				var bounds = global.downloadRegion.bounds().getInfo();
				// ToDo: Replace getThumbURL with getDownloadURL
				// ToDo: ASYNC
				var url = image.getThumbURL({
					format: this.translateOutputFormat(format),
					dimensions: '512',
					region: bounds
				});
				return url;
			}
			else {
				var fileName = Utils.generateHash() + "/result-" + Date.now() +  "." + this.translateOutputFormat(format);
				var p = path.normalize(path.join(this.tempFolder, fileName));
				var parent = path.dirname(p);
				Utils.mkdirSyncRecursive(parent);
				fs.writeFileSync(p, JSON.stringify(obj));
				return Utils.getApiUrl("/temp/" + fileName);
			}
		});
	}

	translateOutputFormat(format) {
		format = format.toLowerCase();
		switch(format) {
			case 'jpeg':
				return 'jpg';
			default:
				return format;
		}
	}

};