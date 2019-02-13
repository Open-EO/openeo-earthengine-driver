const axios = require('axios');
const Utils = require('./utils');
const fse = require('fs-extra');
const path = require('path');
const Errors = require('./errors');
const ProcessUtils = require('./processUtils');

module.exports = class JobsAPI {

	constructor() {
		this.tempFolder = './storage/temp_files';
		this.jobFolder = './storage/job_files';
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

		server.addEndpoint('get', '/jobs/{job_id}/results', this.getJobResults.bind(this));
		server.addEndpoint('post', '/jobs/{job_id}/results', this.postJobResults.bind(this));
		// It's currently not possible to cancel job processing as we can't interrupt the POST request.

		server.addEndpoint('get', '/temp/{token}/{file}', this.getTempFile.bind(this));
		server.addEndpoint('get', '/storage/{job_id}/{file}', this.getStorageFile.bind(this));

		server.createSubscriptions(['openeo.jobs.debug']);

		return Promise.resolve();
	}

	makeFolder(baseFolder, dirs) {
		var p = path.normalize(path.join(baseFolder, ...dirs));
		if (!p || !p.startsWith(path.normalize(baseFolder))) {
			return false;
		}
		return p;
	}

	getTempFile(req, res, next) {
		var p = this.makeFolder(this.tempFolder, [req.params.token, req.params.file]);
		if (!p) {
			return next(new Errors.NotFound());
		}
		this.deliverFile(req, res, next, p);
	}

	getStorageFile(req, res, next) {
		var p = this.makeFolder(this.jobFolder, [req.params.job_id, req.params.file]);
		if (!p) {
			return next(new Errors.NotFound());
		}
		this.deliverFile(req, res, next, p);
	}

	deliverFile(req, res, next, path) {
		req.api.files.isFile(path).then(() => {
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

	removeResults(jobId) {
		var p = this.makeFolder(this.jobFolder, [jobId]);
		if (!p) {
			return Promise.reject(new Errors.NotFound());
		}

		return fse.pathExists(p)
		.then((exists) => exists ? fse.remove(p) : Promise.resolve());
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
				return next(new Errors.JobNotFound());
			}
			else {
				this.removeResults(req.params.job_id)
					.then(() => {
						res.send(204);
						return next();
					})
					.catch(e => next(Errors.wrap(e)));
			}
		});
	}

	postJobResults(req, res, next) {
		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};

		var fileName;
		var filePath;
		this.findJob(query)
		.then(job => {
			if (job.status === 'queued' || job.status === 'running') {
				throw new Errors.JobNotFinished();
			}

			return this.removeResults(job._id)
			.then(() => this.updateJobStatus(query, 'queued'))
			.then(() => {
				res.send(202);
				next();
	
				var jobFormat = this.translateOutputFormat(job.output.format);
				fileName = Utils.generateHash() +  "." + jobFormat;
				filePath = path.normalize(path.join(this.jobFolder, job._id, fileName));
	
				this.sendDebugNotifiction(req, res, "Queueing batch job");
				return this.execute(req, res, job.process_graph, job.output);
			})
		})
		.then(url => {
			this.sendDebugNotifiction(req, res, "Downloading " + url);
			return axios({
				method: 'get',
				url: url,
				responseType: 'stream'
			});
		})
		.then(stream => {
			this.sendDebugNotifiction(req, res, "Download finished, storing result to " + filePath);
			return fse.ensureDir(path.dirname(filePath))
				.then(() => {
					var writer = fse.createWriteStream(filePath);
					stream.data.pipe(writer);
				});
		})
		.then(() => this.updateJobStatus(query, 'finished'))
		.catch(e => {
			this.updateJobStatus(query, 'error');
			this.sendDebugNotifiction(req, res, e);
			next(Errors.wrap(e));
		});
	}

	getJobResults(req, res, next) {
		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};


		this.findJob(query)
		.then(job => {
			if (job.status === 'queued' || job.status === 'running') {
				throw new Errors.JobNotFinished();
			}
			else if (job.status !== 'finished') {
				throw new Errors.JobNotStarted();
			}

			var folder = path.normalize(path.join(this.jobFolder, job._id));
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
						job_id: job._id,
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

	updateJobStatus(query, status) {
		return new Promise((resolve, reject) => {
			this.db.update(query, { $set: { status: status } }, {}, function (err, numChanged) {
				if (err) {
					reject(new Errors.Internal(err));
				}
				else if (numChanged === 0) {
					reject(new Errors.JobNotFound());
				}
				else {
					resolve();
				}
			});
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

	sendDebugNotifiction(req, res, message, processName = null, processParams = {}) {
		try {
			var params = {
				job_id: req.params.job_id || "preview"
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
			req.api.subscriptions.publish(req.user._id, "openeo.jobs.debug", params, payload);
			if (global.server.config.debug) {
				console.log(params.job_id + ": " + message);
			}
		} catch (e) {
			console.log(e);
		}
	}

	patchJob(req, res, next) {
		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		this.findJob(query).then(job => {
			if (job.status === 'queued' || job.status === 'running') {
				throw new Errors.JobLocked();
			}

			var data = {};
			var promises = [];
			for(let key in req.body) {
				if (this.editableFields.includes(key)) {
					switch(key) {
						case 'process_graph':
							promises.push(req.processRegistry.validateProcessGraph(req, req.body.process_graph));
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

			return Promise.all(promises).then(() => data);
		})
		.then(data => {
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
	}

	postJob(req, res, next) {
		let output = {
			format: req.config.outputFormats.default,
			parameters: {}
		};
		if (typeof req.body === 'object' && Utils.isObject(req.body.output) && typeof req.body.output.format === 'string') {
			if (req.config.isValidOutputFormat(req.body.output.format)) {
				output.format = req.body.output.format;
				// ToDo: We don't support any parameters yet, take and check input from req.body.output.parameters
			} else {
				return next(new Errors.FormatUnsupported());
			}
		}

		req.processRegistry.validateProcessGraph(req, req.body.process_graph).then(() => {
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
		if (typeof req.body !== 'object' || !Utils.isObject(req.body.process_graph) || Utils.size(req.body.process_graph) === 0) {
			return next(new Errors.ProcessGraphMissing());
		}

		let plan = req.body.plan || req.config.plans.default;
		let budget = req.body.budget || null;
		// ToDo: Validate data, handle budget and plan input
	
		this.sendDebugNotifiction(req, res, "Starting to process request");
		this.execute(req, res, req.body.process_graph, req.body.output, true).then(url => {
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
		if (full) {
			response.process_graph = job.process_graph;
			if (job.output) {
				response.output = job.output;
			}
		}
		return response;
	}

	execute(req, res, processGraph, output, preview = false) {
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
		// ToDo: req.downloadRegion a hack. Search for all occurances and remove them once a solution is available.
		req.downloadRegion = null;
		return req.processRegistry.executeProcessGraph(req, processGraph).then(obj => {
			if (format.toLowerCase() !== 'json') {
				var image = ProcessUtils.toImage(obj, req);

				// Get bounding box
				if (req.downloadRegion === null) {
	//				req.downloadRegion = image.geometry();
					throw new Errors.BoundingBoxMissing();
				}
				var bounds = req.downloadRegion.bounds().getInfo();

				var size = preview ? 1000 : 2000;
				return new Promise((resolve, reject) => {
//					if (preview) {
						image.getThumbURL({
							format: this.translateOutputFormat(format),
							dimensions: size,
							region: bounds
						}, url => {
							if (!url) {
								reject(new Errors.Internal({message: 'Download URL provided by Google Earth Engine is empty.'}));
							}
							else {
								resolve(url);
							}
						});
/*					}
					else {
						var options = {
							name: "openeo",
							dimensions: size,
							region: bounds
						};
						image.getDownloadURL(options, url => {
							if (!url) {
								reject(new Errors.Internal({message: 'Download URL provided by Google Earth Engine is empty.'}));
							}
							else {
								resolve(url);
							}
						});
					} */
				});
			}
			else {
				var fileName = Utils.generateHash() + "/result-" + Date.now() +  "." + this.translateOutputFormat(format);
				var p = path.normalize(path.join(this.tempFolder, fileName));
				var parent = path.dirname(p);
				return fse.ensureDir(parent)
					.then(() => fse.writeJson(p, obj))
					.then(() => Promise.resolve(Utils.getApiUrl("/temp/" + fileName)));
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