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

	async retrieveResults(dataCube, context) {
		// Execute graph
		var format = dataCube.getOutputFormat();
		if (format.toLowerCase() !== 'json') {
			var bounds = dataCube.getSpatialExtentAsGeeGeometry().bounds().getInfo();
			var size = context.isSynchronousRequest() ? 1000 : 2000;
//			if (syncResult) {
				return new Promise((resolve, reject) => {
					dataCube.image().getThumbURL({
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
				});
/*			}
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
		}
		else {
			var fileName = Utils.generateHash() + "/result-" + Date.now() +  "." + this.translateOutputFormat(format);
			var p = path.normalize(path.join(this.tempFolder, fileName));
			var parent = path.dirname(p);
			await fse.ensureDir(parent);
			await fse.writeJson(p, dataCube.getData());
			return Utils.getApiUrl("/temp/" + fileName);
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