const Utils = require('../utils/utils');
const DB = require('../utils/db');
const fse = require('fs-extra');
const path = require('path');
const Errors = require('../utils/errors');
const Logs = require('./logs');

module.exports = class JobStore {

	constructor() {
		this.db = DB.load('jobs');
		this.editableFields = ['title', 'description', 'process', 'plan', 'budget'];
		this.jobFolder = './storage/job_files';
		this.logFileName = 'logs.db';
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

	getLogFile(jobId) {
		return this.getJobFile(jobId, this.logFileName);
	}

	isFieldEditable(name) {
		return this.editableFields.includes(name);
	}

	async findJob(query) {
		const job = this.db.findOneAsync(query);
		if (job === null) {
			throw new Errors.JobNotFound();
		}
		return job;
	}

	async getById(job_id, user_id) {
		return await this.findJob({
			_id: job_id,
			user_id: user_id
		});
	}

	async removeLogsById(jobId) {
		await fse.unlink(this.getLogFile(jobId));
	}

	async getLogsById(jobId) {
		return await Logs.loadLogsFromCache(
			this.getLogFile(jobId),
			Utils.getApiUrl('/jobs/' + jobId + '/logs')
		);
	}

	async updateJobStatus(query, status) {
		const { numAffected } = await this.db.updateAsync(query, { $set: { status: status } });
		if (numAffected === 0) {
			throw new Errors.JobNotFound();
		}
	}

	async removeResults(jobId, removeLogs = true) {
		const p = this.makeFolder(this.jobFolder, [jobId]);
		if (!p) {
			throw new Errors.NotFound();
		}

		const exists = await fse.pathExists(p);
		if (exists) {
			const promises = (await fse.readdir(p))
				.map(async (file) => {
					const fileDir = path.join(p, file);
					if (removeLogs || file !== this.logFileName) {
						return await fse.unlink(fileDir);
					}
				});
			await Promise.all(promises);
		}
		if (removeLogs) {
			await fse.remove(p);
		}
	}

	makeFolder(baseFolder, dirs) {
		var p = path.normalize(path.join(baseFolder, ...dirs));
		if (!p || !p.startsWith(path.normalize(baseFolder))) {
			return false;
		}
		return p;
	}

};