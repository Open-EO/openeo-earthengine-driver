const Datastore = require('nedb');
const crypto = require("crypto");

var Utils = {

	toISODate(timestamp) {
		return timestamp; // ToDo
	},
	
	encodeQueryParams(data) {
		let ret = [];
		for (let d in data) {
			ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
		}
		return ret.join('&');
	},
	
	size(obj) {
		return Object.keys(obj).length;
	},

	loadDB(name) {
		return new Datastore({ filename: './storage/' + name + '.db', autoload: true });
	},

	generateHash() {
		return crypto.randomBytes(16).toString("hex");
	}


};

module.exports = Utils;
