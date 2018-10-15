const axios = require('axios');
const ProcessRegistry = require('./processRegistry');
const Utils = require('./utils');
const fs = require('fs');
const path = require('path');
const Errors = require('./errors');
const eeUtils = require('./eeUtils');

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

		return new Promise((resolve, reject) => resolve());
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
				jobs = jobs.map(job => {
					return this.makeJobResponse(job, false);
				});
				res.json(jobs);
				return next();
			}
		});
	}

	getJob(req, res, next) {
		this.findJobForUserById(req.params.job_id, req.user._id)
			.then(job => {
				res.json(this.makeJobResponse(job));
				return next();
			})
			.catch(e => {
				return next(e);
			});
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

			try {
				this.sendDebugNotifiction(req, res, "Starting to process download request");
				var url = this.execute(req, res, job.process_graph, job.output);
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
				return next();
			} catch (e) {
				this.sendDebugNotifiction(req, res, e);
				return next(e);
			}
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
			res.subscriptions.publish(req, "openeo.jobs.debug", params, payload);
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
			for(let key in req.body) {
				if (this.editableFields.includes(key)) {
					switch(key) {
						case 'process_graph':
							if (Utils.size(req.body[key]) === 0) {
								return next(new Errors.ProcessGraphMissing());
							}

							try {
								ProcessRegistry.parseProcessGraph(req.body.process_graph, req, res, false);
							} catch (e) {
								return next(e);
							}
							break;
						case 'output':
							if (typeof req.body.output === 'object' && typeof req.body.output.format !== 'string') {
								return next(new Errors.FormatUnsupported());
							}
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
		});
	}

	postJob(req, res, next) {
		if (typeof req.body.process_graph !== 'object' || Utils.size(req.body.process_graph) === 0) {
			return next(new Errors.ProcessGraphMissing());
		}

		let output = {
			format: req.config.outputFormats.default,
			parameters: {}
		};
		if (typeof req.body.output === 'object' && typeof req.body.output.format === 'string') {
			if (req.config.isValidOutputFormat(req.body.output.format)) {
				output.format = req.body.output.format;
				// ToDo: We don't support any parameters yet, take and check input from req.body.output.parameters
			} else {
				throw new Errors.FormatUnsupported();
			}
		}

		try {
			ProcessRegistry.parseProcessGraph(req.body.process_graph, req, res, false);
		} catch (e) {
			console.log(e);
			return next(e);
		}

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
				return next(new Errors.Internal(err));
			}
			else {
				res.redirect(201, Utils.getServerUrl() + '/jobs/' + job._id, next);
			}
		});
	}

	postPreview(req, res, next) {
		if (typeof req.body.process_graph !== 'object' || Utils.size(req.body.process_graph) === 0) {
			return next(Errors.ProcessGraphMissing());
		}
	
		this.sendDebugNotifiction(req, res, "Starting to process request");
		try {
			var url = this.execute(req, res, req.body.process_graph, req.body.output);
			this.sendDebugNotifiction(req, res, "Downloading " + url);
			console.log("Downloading " + url);
			axios({
				method: 'get',
				url: url,
				responseType: 'stream'
			}).then(stream => {
				var contentType = typeof stream.headers['content-type'] !== 'undefined' ? stream.headers['content-type'] : 'application/octet-stream';
				res.header('Content-Type', contentType);
				stream.data.pipe(res);
				return next();
			}).catch(e => {
				this.sendDebugNotifiction(req, res, e);
				return next(Errors.Internal(e));
			});
		} catch (e) {
			this.sendDebugNotifiction(req, res, e);
			return next(e);
		}
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
			costs: job.costs,
			budget: job.budget
		};
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
		if (typeof output === 'object' && typeof output.format === 'string') {
			if (req.config.isValidOutputFormat(output.format)) {
				format = output.format;
				// ToDo: We don't support any parameters yet, take and check input from output.parameters
			} else {
				throw new Errors.FormatUnsupported();
			}
		}
		else {
			format = req.config.outputFormats.default;
		}

		// Execute graph
		// ToDo: global.downloadRegion a hack. Search for all occurances and remove them once a solution is available.
		global.downloadRegion = null;
		var obj = ProcessRegistry.parseProcessGraph(processGraph, req, res);
		if (format.toLowerCase() !== 'json') {
			var image = eeUtils.toImage(obj, req, res);

			// Download image
			if (global.downloadRegion === null) {
//				global.downloadRegion = image.geometry();
				throw new Errors.BoundingBoxMissing();
			}
			var bounds = global.downloadRegion.bounds().getInfo();
			// ToDo: Replace getThumbURL with getDownloadURL
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
			return Utils.getServerUrl() + "/temp/" + fileName;
		}
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