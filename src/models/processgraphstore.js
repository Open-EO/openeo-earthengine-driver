import Errors from '../utils/errors.js';
import DB from '../utils/db.js';

class ProcessGraphStore {

	constructor() {
		this.db = DB.load('process_graphs');
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

	async getById(id, user_id) {
		const query = {
			id: id,
			user_id: user_id
		};
		const pg = await this.db.findOneAsync(query);
		if (pg === null) {
			throw new Errors.ProcessGraphNotFound();
		}
		return pg;
	}

	async getByToken(token) {
		const query = {
			token: token
		};
		const pg = await this.db.findOneAsync(query);
		if (pg === null) {
			throw new Errors.ProcessGraphNotFound();
		}
		return pg;
	}

}

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

export default ProcessGraphStore;
