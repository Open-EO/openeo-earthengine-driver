const Errors = require('../errors');
const Utils = require('../utils');

class ProcessGraphStore {

	constructor() {
		this.db = Utils.loadDB('process_graphs');
	}

	database() {
		return this.db;
	}

	getFields() {
		return ProcessGraphStore.FIELDS;
	}

	isFieldEditable(name) {
		return ProcessGraphStore.FIELDS.includes(name);
	}

	getById(id, user_id) {
		return new Promise((resolve, reject) => {
			let query = {
				id: id,
				user_id: user_id
			};
			this.db.findOne(query, {}, (err, pg) => {
				if (err) {
					reject(Errors.wrap(err));
				}
				else if (pg === null) {
					reject(new Errors.ProcessGraphNotFound());
				}
				else {
					resolve(pg);
				}
			});
		});
	}

};

ProcessGraphStore.FIELDS = [
	'id',
	'summary',
	'description',
	'categories',
	'parameters',
	'returns',
	'deprecated',
	'experimental',
	'exceptions',
	'examples',
	'links',
	'process_graph'
];

module.exports = ProcessGraphStore;