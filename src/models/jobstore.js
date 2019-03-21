const Utils = require('../utils');
const fse = require('fs-extra');
const path = require('path');
const Errors = require('../errors');

module.exports = class JobStore {

	constructor() {
		this.db = Utils.loadDB('jobs');
		this.editableFields = ['title', 'description', 'process_graph', 'plan', 'budget'];
		this.tempFolder = './storage/temp_files';
		this.jobFolder = './storage/job_files';
	}

	database() {
		return this.db;
	}

	getTempFolder() {
		return this.tempFolder;
	}

	getFolder() {
		return this.getJobFolder;
	}

	getJobFolder(jobId) {
		return path.normalize(path.join(this.jobFolder, jobId));
	}

	getJobFile(jobId, file) {
		return path.normalize(path.join(this.jobFolder, jobId, file))
	}

	isFieldEditable(name) {
		return this.editableFields.includes(name);
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

	getById(job_id, user_id) {
		return this.findJob({
			_id: job_id,
			user_id: user_id
		});
	}

	updateJobStatus(query, status, error = null) {
		return new Promise((resolve, reject) => {
			if (error !== null) {
				error = Error.wrap(error).toJson();
			}
			this.db.update(query, { $set: { status: status, error: error } }, {}, function (err, numChanged) {
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

	removeResults(jobId) {
		var p = this.makeFolder(this.jobFolder, [jobId]);
		if (!p) {
			return Promise.reject(new Errors.NotFound());
		}

		return fse.pathExists(p)
		.then((exists) => exists ? fse.remove(p) : Promise.resolve());
	}

	makeFolder(baseFolder, dirs) {
		var p = path.normalize(path.join(baseFolder, ...dirs));
		if (!p || !p.startsWith(path.normalize(baseFolder))) {
			return false;
		}
		return p;
	}

	execute(req, res, processGraph, output, syncResult = false) {
		// Check output format
		var format;
		if (Utils.isObject(output) && typeof output.format === 'string') {
			if (global.server.serverContext.isValidOutputFormat(output.format)) {
				format = output.format;
				// ToDo: We don't support any parameters yet, take and check input from output.parameters
			} else {
				return Promise.reject(new Errors.FormatUnsupported());
			}
		}
		else {
			return Promise.reject(new Errors.FormatMissing());
		}

		// Execute graph
		// ToDo: req.downloadRegion a hack. Search for all occurances and remove them once a solution is available.
		req.downloadRegion = null;
		return req.processRegistry.executeProcessGraph(req, processGraph).then(obj => {
			if (format.toLowerCase() !== 'json') {
				var image = Utils.toImage(obj, req);

				// Get bounding box
				if (req.downloadRegion === null) {
	//				req.downloadRegion = image.geometry();
					throw new Errors.BoundingBoxMissing();
				}
				var bounds = req.downloadRegion.bounds().getInfo();

				var size = syncResult ? 1000 : 2000;
				return new Promise((resolve, reject) => {
//					if (syncResult) {
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