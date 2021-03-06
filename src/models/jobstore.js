const Utils = require('../utils');
const fse = require('fs-extra');
const path = require('path');
const Errors = require('../errors');
const Logs = require('./logs');

module.exports = class JobStore {

	constructor() {
		this.db = Utils.loadDB('jobs');
		this.editableFields = ['title', 'description', 'process', 'plan', 'budget'];
		this.jobFolder = './storage/job_files';
	}

	database() {
		return this.db;
	}

	getFolder() {
		return this.jobFolder;
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
					reject(Errors.wrap(err));
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

	async getLogsById(job_id) {
		let file = this.getJobFile(job_id, 'logs.db');
		let url = Utils.getApiUrl('/jobs/' + job_id + '/logs');
		return await Logs.loadLogsFromCache(file, url);
	}

	updateJobStatus(query, status) {
		return new Promise((resolve, reject) => {
			this.db.update(query, { $set: { status: status } }, {}, function (err, numChanged) {
				if (err) {
					reject(Errors.wrap(err));
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

};