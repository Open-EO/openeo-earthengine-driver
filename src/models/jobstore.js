import API from '../utils/API.js';
import DB from '../utils/db.js';
import fse from 'fs-extra';
import path from 'path';
import Errors from '../utils/errors.js';
import Logs from './logs.js';
import Utils from '../utils/utils.js';

const TASK_STATUS_MAP = {
	PENDING: 'queued',
	RUNNING : 'running',
	CANCELLING: 'cancelled',
	SUCCEEDED: 'finished',
	CANCELLED: 'canceled',
	FAILED: 'error'
};

export default class JobStore {

	constructor() {
		this.db = DB.load('jobs');
		this.taskDb = DB.load('tasks');
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
		const job = await this.db.findOneAsync(query);
		if (job === null) {
			throw new Errors.JobNotFound({identifier: query._id});
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

	async getLogsById(jobId, log_level) {
		return await Logs.loadLogsFromCache(
			this.getLogFile(jobId),
			API.getUrl('/jobs/' + jobId + '/logs'),
			log_level
		);
	}

	async updateJobStatus(query, status) {
		const { numAffected } = await this.db.updateAsync(query, { $set: { status: status } });
		if (numAffected === 0) {
			throw new Errors.JobNotFound({identifier: query._id});
		}
	}

	async addTasks(job, tasks) {
		const rows = [];
		let logger = null;
		for (const task of tasks) {
			let status = 'queued';
			if (task.error) {
				status = 'error';
				if (logger === null) {
					logger = await this.getLogsById(job._id, job.log_level);
				}
				logger.error(task.error, {taskId: task.taskId});
			}
			rows.push({
				task_id: task.taskId,
				image_id: task.imageId,
				job_id: job._id,
				user_id: job.user_id,
				google_user_id: Utils.isGoogleUser(job.user_id) ? job.user_id : '',
				done: false,
				script: null,
				status,
				stageOffset: 0,
				progress: 0,
				updated: Utils.toISODate(Date.now()),
				results: [],
				usage: null
			});
		}
		await this.taskDb.insertAsync(rows);
	}

	async getTaskCount(google_user_id) {
		return await this.taskDb.countAsync({google_user_id});
	}

	async updateTasks(ops) {
		const documents = {};
		const newLogs = {};
		for (const op of ops) {
			try {
				const taskId = op.name.split('/').pop();
				const query = { task_id: taskId };
				const task = await this.taskDb.findOneAsync(query);
				if (!task || (task.done && op.done)) {
					// (1) Task not found, probably started in GEE directly, OR
					// (2) Task is done and we synced it already, no need to update
					continue;
				}

				const jobId = task.job_id;
				documents[jobId] = documents[jobId] || [];
				newLogs[jobId] = newLogs[jobId] || [];

				if (task.attempt > 1 && task.attempt !== op.metadata.attempt) {
					// New attempt, reset stage offset
					task.stageOffset = 0;
					newLogs[jobId].push({
						level: 'warning',
						message: 'Started new attempt, previous attempt was aborted.'
					});
				}

				if (Array.isArray(op.metadata.stages)) {
					const stages = op.metadata.stages.slice(task.stageOffset);
					for (const stage of stages) {
						task.stageOffset++;
						newLogs[jobId].push({
							level: 'info',
							message: stage.description
						});
					}
				}
				if (op.done && op.error) {
					newLogs[jobId].push({
						level: 'error',
						message: op.error.message,
						code: String(op.error.message.code),
						data: op.error.details
					});
				}

				let progress = ops.done ? 100 : 0;
				if (op.metadata.progress > 0) {
					progress = op.metadata.progress * 100;
				}

				if (!task.script && op.metadata.scriptUri) {
					newLogs[jobId].push({
						level: 'info',
						message: 'Google Earth Engine script can be found at: ' + op.metadata.scriptUri
					});
				}

				const update = {
					$set: {
						status: TASK_STATUS_MAP[op.metadata.state],
						progress,
						attempt: op.metadata.attempt || 0,
						done: op.done || false,
						updated: op.metadata.updateTime,
						script: op.metadata.scriptUri || null,
						results: op.metadata.destinationUris || [],
						usage: op.metadata.batchEecuUsageSeconds || 0,
						stageOffset: task.stageOffset
					}
				};

				const { affectedDocuments } = await this.taskDb.updateAsync(query, update, { returnUpdatedDocs: true });
				if (affectedDocuments) {
					documents[task.job_id].push(affectedDocuments);
				}
			} catch (e) {
				console.error(e);
			}

			for(const jobId in documents) {
				const tasks = documents[jobId];
				const job = await this.getById(jobId, tasks[0].user_id);

				const jobUpdates = {
					updated: Utils.toISODate(Date.now())
				};
				if (tasks.some(t => t.status === 'running')) {
					jobUpdates.status = 'running';
				}
				else if (tasks.every(t => t.status === 'finished')) {
					jobUpdates.status = 'finished';
				}
				else if (tasks.some(t => t.status === 'error')) {
					jobUpdates.status = 'error';
				}
				else if (tasks.some(t => t.status === 'canceled')) {
					jobUpdates.status = 'canceled';
				}
				else {
					jobUpdates.status = 'queued';
				}

				jobUpdates.progress = tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length;

				jobUpdates.usage = {
					cpu: {
						value: tasks.reduce((acc, t) => acc + t.batchEecuUsageSeconds, 0),
						unit: 'eecu-seconds'
					}
				};

				jobUpdates.googleDriveResults = tasks.reduce((acc, t) => acc.concat(t.results), []);

				await this.db.updateAsync({_id: jobId}, { $set: jobUpdates });

				if (newLogs[jobId].length > 0) {
					const logs = await this.getLogsById(jobId, job.log_level);
					for (const log of newLogs[jobId]) {
						logs.add(log.message, log.level, log.data, logs.trace, log.code);
					}
				}
			}
		}
	}

	async removeTasks(taskIds) {
		if (!Array.isArray(taskIds)) {
			taskIds = [taskIds];
		}

		const query = { task_id: { $in: taskIds } };
		const { numRemoved } = await this.taskDb.removeAsync(query);
		return numRemoved;
	}

	async removeTasksForUser(userId) {
		const { numRemoved } = await this.taskDb.removeAsync({ user_id: userId });
		return numRemoved;
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
		const p = path.normalize(path.join(baseFolder, ...dirs));
		if (!p || !p.startsWith(path.normalize(baseFolder))) {
			return false;
		}
		return p;
	}

}
