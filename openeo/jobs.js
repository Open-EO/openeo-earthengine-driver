const axios = require('axios');
const Capabilities = require('./capabilities');
const ProcessRegistry = require('./processRegistry');
const Utils = require('./utils');

const CANCELED_STATE = 'canceled';

var Jobs = {

	db: null,

	init() {
		this.db = Utils.loadDB('jobs');
		console.log("INFO: Jobs loaded.");
		return new Promise((resolve, reject) => resolve());
	},

	routes(server) {
		server.addEndpoint('post', '/execute', this.postExecute.bind(this));
		server.addEndpoint('post', '/jobs', this.postJob.bind(this));
		server.addEndpoint('get', '/jobs/{job_id}/download', this.getJobDownload.bind(this));
		server.addEndpoint('patch', '/jobs/{job_id}/cancel', this.patchJobCancel.bind(this));
		server.addEndpoint('get', '/users/{user_id}/jobs', this.getUserJobs.bind(this));
	},

	getUserJobs(req, res, next) {
		var query = {
			user_id: req.user._id
		};
		this.db.find(query, {}, (err, jobs) => {
			if (err) {
				res.send(500, err);
				return next();
			}
			else {
				jobs = jobs.map(job => {
					return this.makeJobResponse(job);
				});
				res.json(jobs);
				return next();
			}
		});
	},

	patchJobCancel(req, res, next) {
		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		this.db.update(query, { $set: { status: CANCELED_STATE } }, {}, function (err, numChanged) {
			if (err) {
				res.send(500, err);
				return next();
			}
			else if (numChanged === 0) {
				res.send(404);
				return next();
			}
			else {
				res.send(200);
				return next();
			}
		});
	},

	findJob(query) {
		return new Promise((resolve, reject) => {
			this.db.findOne(query, {}, (err, job) => {
				if (err || job === null) {
					reject();
				}
				else {
					resolve(job);
				}
			});
		});
	},

	findJobById(job_id) {
		return this.findJob({
			_id: job_id
		});
	},

	findJobForUserById(job_id, user_id) {
		return this.findJob({
			_id: job_id,
			user_id: user_id
		});
	},

	getJobDownload(req, res, next) {
		var query = {
			_id: req.params.job_id,
			user_id: req.user._id
		};
		this.db.findOne(query, {}, (err, job) => {
			if (err) {
				res.send(500, err);
				return next();
			}
			else if (job === null) {
				res.send(404);
				return next();
			}
			else if (job.status.toLowerCase() === CANCELED_STATE) {
				res.send(410);
				return next();
			}

			try {
				var url = this.execute(job.process_graph, job.output);
				res.send([url]);
			} catch (e) {
				if (e === 406) {
					res.send(406);
				}
				else {
					res.send(400, e);
				}
			}
			return next();
		});
	},

	postJob(req, res, next) {
		if (typeof req.body.process_graph !== 'object' || Utils.size(req.body.process_graph) === 0) {
			res.send(400, "No process_graph specified.");
			return next();
		}
		try {
			ProcessRegistry.parseProcessGraph(req.body.process_graph, false);
		} catch (e) {
			res.send(400, e); // Invalid process graph
			return next();
		}

		var data = {
			process_graph: req.body.process_graph,
			status: "submitted",
			submitted: Utils.getISODateTime(),
			updated: Utils.getISODateTime(),
			user_id: req.user._id,
			consumed_credits: 0
		};
		if (typeof req.body.output === 'object' && typeof req.body.output.format === 'string') {
			data.output = req.body.output;
		}
		this.db.insert(data, (err, job) => {
			if (err) {
				res.send(500, err);
				return next();
			}
			else {
				res.json(this.makeJobResponse(job));
				return next();
			}
		});
	},

	postExecute(req, res, next) {
		if (typeof req.body.process_graph !== 'object' || Utils.size(req.body.process_graph) === 0) {
			res.send(400, "No process_graph specified.");
			return next();
		}
	
		try {
			var url = this.execute(req.body.process_graph, req.body.output);
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
			}).catch((e) => {
				console.log(e);
				res.send(500);
				next();
			});
		} catch (e) {
			if (e === 406) {
				res.send(406);
			}
			else {
				res.send(400, e);
			}
			return next();
		}
	},

	makeJobResponse(job) {
		return {
			job_id: job._id,
			status: job.status,
			submitted: job.submitted,
			updated: job.updated,
			user_id: job.user_id,
			consumed_credits: job.consumed_credits
		};
	},

	execute(processGraph, output) {
		// Check output format
		var format = Capabilities.getDefaultOutputFormat();
		if (typeof output === 'object' && typeof output.format === 'string') {
			if (Capabilities.isValidOutputFormat(output.format)) {
				format = output.format;
			} else {
				throw 406;
			}
		}

		// Execute graph
		global.downloadRegion = null; // This is a hack. Search for all occurances and remove them.
		var obj = ProcessRegistry.parseProcessGraph(processGraph);
		var image = ProcessRegistry.toImage(obj);

		// Download image
		if (global.downloadRegion === null) {
			global.downloadRegion = image.geometry();
		}
		var bounds = global.downloadRegion.bounds().getInfo();
		// ToDo: Replace getThumbURL with getDownloadURL
		var url = image.getThumbURL({
			format: Capabilities.translateOutputFormat(format),
			dimensions: '512',
			region: bounds
		});
		return url;
	}

};

module.exports = Jobs;