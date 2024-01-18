import fse from 'fs-extra';
import path from 'path';
import Datastore from '@seald-io/nedb';
import Utils from '../utils/utils.js';

const LOG_LEVELS = ['error', 'warning', 'info', 'debug'];
var LOG_CACHE = {};

export default class Logs {

	static checkLevel(level, defaulValue = null) {
		if (typeof level === 'string') {
			level = level.toLowerCase();
		}
		return LOG_LEVELS.includes(level) ? level : defaulValue;
	}

	static getApplicableLevels(level) {
		return LOG_LEVELS.slice(0, LOG_LEVELS.indexOf(level) + 1);
	}

	static async loadLogsFromCache(file, url, log_level) {
		let now = Date.now();
		// Free up memory
		for(let file in LOG_CACHE) {
			if (LOG_CACHE[file].lastAccess < now - 6*60*60*1000) {
				delete LOG_CACHE[file];
			}
		}
		let exists = await fse.exists(file);
		// Load db from cache
		if (exists && LOG_CACHE[file]) {
			LOG_CACHE[file].lastAccess = now;
			return LOG_CACHE[file].db;
		}
		// Read db from fs
		else {
			let logs = new Logs(file, url, log_level);
			await logs.init();
			LOG_CACHE[file] = {
				lastAccess: now,
				db: logs
			};
			return logs;
		}
	}

	constructor(file, baseUrl, level = null) {
		this.file = file;
		this.url = baseUrl;
		this.level = level;
	}

	async init() {
		await fse.ensureDir(path.dirname(this.file));

		this.db = new Datastore({ filename: this.file });
		this.db.stopAutocompaction();
		await this.db.loadDatabaseAsync();
	}

	shouldLog(level) {
		return !this.level || LOG_LEVELS.indexOf(level) <= LOG_LEVELS.indexOf(this.level);
	}

	debug(message, data = null, trace = undefined) {
		this.add(message, 'debug', data, trace);
	}

	info(message, data = null, trace = undefined) {
		this.add(message, 'info', data, trace);
	}

	warn(message, data = null, trace = undefined) {
		this.add(message, 'warning', data, trace);
	}

	error(error, data = null, trace = undefined, code = undefined, links = undefined) {
		if (Utils.isObject(error)) {
			if (error.url) {
				let link = {
					href: error.url,
					rel: 'about'
				};
				if (Array.isArray(links)) {
					links.push(link);
				}
				else {
					links = [link];
				}
			}
			code = code || error.code || error.constructor.name;
			let message = error.message || String(error);
			this.add(message, 'error', data, trace, code, links, error.id);
		}
		else {
			this.add(error, 'error', data, trace, code, links);
		}
	}

	add(message, level = "debug", data = null, trace = undefined, code = undefined, links = undefined, id = undefined) {
		id = id || Utils.timeId();
		message = String(message);
		level = LOG_LEVELS.includes(level) ? level : 'debug';
		let log = {
			_id: id,
			id: id,
			message: message,
			level: level,
			path: trace,
			code: code,
			links: links,
			data: data,
			time: Utils.getISODateTime()
		};
		if (global.server.serverContext.debug) {
			console.log(log);
		}
		if (this.shouldLog(level)) {
			this.db.insert(log, err => {
				if (err && global.server.serverContext.debug) {
					console.warn(err);
				}
			});
		}
	}

	async clear() {
		await this.db.remove({}, { multi: true });
		this.db.compactDatafile();
	}

	async get(offset = null, limit = 0, level = null) {
		limit = parseInt(limit);
		offset = typeof offset === 'string' ? offset : null;
		level = Logs.checkLevel(level, this.level);

		let query = {};
		if (offset) {
			query._id = { $gt: offset };
		}
		if (level !== 'debug') {
			query.level = { $in: Logs.getApplicableLevels(level) };
		} // else: debug is the lowest level, so all levels will be included anyway

		let cur = this.db.find(query, {_id: 0});
		if (limit >= 1) {
			cur = cur.limit(limit + 1); // +1 to check for more elements
		}
		const logs = await cur.execAsync();
		let links = [];
		// Are there more elements?
		if (limit >= 1 && logs.length === limit + 1) {
			logs.pop();
			let last = logs[logs.length - 1];
			let url = new URL(this.url);
			url.searchParams.set('offset', last.id);
			if (limit >= 1) {
				url.searchParams.set('limit', limit);
			}
			if (level) {
				url.searchParams.set('level', level);
			}
			links.push({
				rel: 'next',
				href: url.toString()
			});
		}
		return {level, logs, links};
	}

}
