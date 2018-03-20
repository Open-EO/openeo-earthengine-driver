const Datastore = require('nedb');
const crypto = require("crypto");

var Utils = {

	toISODate(timestamp) {
		return (new Date(timestamp)).toISOString().substr(0, 10);
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

	generateHash(length = 16) {
		return crypto.randomBytes(Math.ceil(length/2)).toString('hex').slice(0,length);
	},

	encryptPassword(password){
		return this.hashPassword(password, this.generateHash(16));
	},

	hashPassword(password, salt){
		var hash = crypto.createHmac('sha512', salt);
		hash.update(password);
		return {
			salt: salt,
			passwordHash: hash.digest('hex')
		};
	},

	getTimestamp() {
		return Math.floor(Date.now() / 1000);
	},

	getISODateTime() {
		return (new Date()).toISOString().replace('.000', '');
	}

};

module.exports = Utils;
