const fse = require('fs-extra');
const path = require('path');
const Errors = require('../errors');
const Datastore = require('nedb');

const LOG_LEVELS = ['error', 'warning', 'info', 'debug'];

module.exports = class Logs {

	constructor(file, baseUrl) {
		this.file = file;
		this.url = baseUrl;
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

	add(message, level = "debug", data = null, path = undefined, code = undefined, links = undefined) {
		let id = process.hrtime().map(s => String(s).padStart(17, '0')).join('');
		let log = {
			_id: id,
			id: id,
			message: String(message),
			level: LOG_LEVELS.includes(level) ? level : 'debug',
			data,
			path,
			code,
			links
		};
		console.log(log);
		this.db.insert(log);
	}

	clear() {
		return new Promise((resolve, reject) => {
			this.db.remove({}, { multi: true }, function (err) {
				if (err) {
					reject(Errors.wrap(err));
				}
				else {
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
			let cur = this.db.find(query);
			if (limit >= 1) {
				cur = cur.limit(limit + 1); // +1 to check for more elements
			}
			cur.exec(function (err, logs) {
				if (err) {
					reject(Errors.wrap(err));
				}
				else {
					let links = [];
					// Are there more elements?
					if (logs.length === limit + 1) {
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