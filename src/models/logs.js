const fse = require('fs-extra');
const path = require('path');
const Errors = require('../errors');
const Datastore = require('nedb');
const Utils = require('../utils');

const LOG_LEVELS = ['error', 'warning', 'info', 'debug'];

module.exports = class Logs {

	constructor(file, baseUrl, requestId = null) {
		this.file = file;
		this.url = baseUrl;
		this.requestId = requestId;
	}

	init() {
		return new Promise((resolve, reject) => {
			fse.ensureDir(path.dirname(this.file)).then(() => {
				this.db = new Datastore({ filename: this.file });
				this.db.persistence.stopAutocompaction();
				this.db.loadDatabase(function (err) {
					if (err) {
						reject(Errors.wrap(err));
					}
					else {
						resolve();
					}
				});
			}).catch(err => reject(Errors.wrap(err)));
		});
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
			this.add(message, 'error', data, trace, code, links);
		}
	}

	add(message, level = "debug", data = null, trace = undefined, code = undefined, links = undefined, id = undefined) {
		id = id || Utils.timeId();
		message = String(message);
		if (this.requestId) {
			message = this.requestId + ' | ' + message;
		}
		level = LOG_LEVELS.includes(level) ? level : 'debug';
		let log = {
			_id: id,
			id: id,
			message: message,
			level: level,
			path: trace,
			code: code,
			links: links,
			data: data
		};
		if (global.server.serverContext.debug) {
			console.log(log);
		}
		this.db.insert(log, err => {
			if (err) {
				console.warn(err);
			}
		});
	}

	clear() {
		return new Promise((resolve, reject) => {
			this.db.remove({}, { multi: true }, err => {
				if (err) {
					reject(Errors.wrap(err));
				}
				else {
					this.db.persistence.compactDatafile();
					resolve();
				}
			});
		});
	}

	get(offset = null, limit = 0) {
		limit = parseInt(limit);
		offset = typeof offset === 'string' ? offset : null;

		return new Promise((resolve, reject) => {
			let query = {};
			if (offset) {
				query._id = { $gt: offset };
			}
			let cur = this.db.find(query, {_id: 0});
			if (limit >= 1) {
				cur = cur.limit(limit + 1); // +1 to check for more elements
			}
			cur.exec((err, logs) => {
				if (err) {
					reject(Errors.wrap(err));
				}
				else {
					let links = [];
					// Are there more elements?
					if (limit >= 1 && logs.length === limit + 1) {
						logs.pop();
						let last = logs[logs.length - 1];
						let url = this.url + '?offset=' + last.id + (limit >= 1 ? '&limit=' + limit : '')
						links.push({
							rel: 'next',
							href: url
						});
					}
					resolve({logs, links});
				}
			});
		});
	}

};