const Utils = require('../utils');

module.exports = class ProcessGraphStore {

	constructor() {
		this.db = Utils.loadDB('process_graphs');
		this.editableFields = ['title', 'description', 'process_graph', 'public'];
	}

	database() {
		return this.db;
	}

	isFieldEditable(name) {
		return this.editableFields.includes(name);
	}

	getById(id, user_id) {
		return new Promise((resolve, reject) => {
			this.db.findOne({_id: id}, {}, (err, pg) => {
				if (err) {
					reject(Errors.wrap(err));
				}
				else if (pg === null || (pg.public !== true && pg.user_id !== user_id)) {
					reject(new Errors.ProcessGraphNotFound());
				}
				else {
					resolve(pg);
				}
			});
		});
	}

};