const Utils = require('../utils');
const Errors = require('../errors');
const crypto = require("crypto");

module.exports = class UserStore {
	
	constructor() {
		this.db = Utils.loadDB('users');
	}

	database() {
		return this.db;
	}

	encryptPassword(password){
		return this.hashPassword(password, Utils.generateHash(16));
	}

	hashPassword(password, salt){
		var hash = crypto.createHmac('sha512', salt);
		hash.update(password);
		return {
			salt: salt,
			passwordHash: hash.digest('hex')
		};
	}

	emptyUser(withId = true) {
		var user = {
			password: null,
			passwordSalt: null,
			token: null,
			tokenExpiry: 0
		};
		if (withId) {
			user._id = false;
		}
		return user;
	}

	login(username, password) {
		return new Promise((resolve, reject) => {
			var query = {
				_id: username
			};
			this.db.findOne(query, (err, user) => {
				if (err) {
					return reject(Errors.wrap(err));
				}
				else if (user === null) {
					return reject(new Errors.AuthenticationRequired({
						reason: 'User not found'
					}));
				}

				var pw = this.hashPassword(password, user.passwordSalt);
				if (pw.passwordHash !== user.password) {
					return reject(new Errors.AuthenticationRequired({
						reason: 'Password invalid'
					}));
				}

				user.token = Utils.generateHash();
				user.tokenTime = Utils.getTimestamp();
				var dataToUpdate = {
					token: user.token,
					tokenTime: user.tokenTime
				};
				this.db.update(query, { $set: dataToUpdate }, {}, (err, numReplaced) => {
					if (numReplaced !== 1) {
						return reject(Errors.wrap(err));
					}

					return resolve(user);
				});
			});
		});
	}

	checkAuthToken(token) {
		return new Promise((resolve, reject) => {
			this.db.findOne({ token: token }, {}, (err, user) => {
				if (err) {
					reject(Errors.wrap(err));
				}
				else if (user === null) {
					reject(new Errors.AuthenticationRequired({
						reason: 'Token invalid.'
					}));
				}
				else {
					// ToDo: Expire token
			
					// Update token time
					user.tokenTime = Utils.getTimestamp();
					this.db.update({ token: token }, { $set: { tokenTime: user.tokenTime } }, {});

					resolve(user);
				}
			});
		});
	}

};