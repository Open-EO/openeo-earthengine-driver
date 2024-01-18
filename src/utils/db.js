import Datastore from '@seald-io/nedb';

export default {

	all: [],

	load(name, folder = './storage/database/') {
		var db = new Datastore({ filename: folder + name + '.db', autoload: true });
		db.setAutocompactionInterval(24 * 60 * 60 * 1000);
		this.all.push(db);
		return db;
	},

	closeAll() {
		this.all.forEach(db => db.stopAutocompaction());
		this.all = [];
	}

}
