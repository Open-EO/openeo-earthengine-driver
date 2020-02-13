const Utils = require('../utils');
const Errors = require('../errors');
const crypto = require("crypto");

module.exports = class UserStore {
	
	constructor() {
		this.db = Utils.loadDB('users');
		this.tokenDb = Utils.loadDB('token');
		this.tokenValidity = 24*60*60;
	}

	database() {
		return this.db;
	}

	tokenDatabase() {
		return this.tokenDb;
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
			name: null,
			password: null,
			passwordSalt: null
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

				// Delete old token
				var query = {
					validity: { $lt: Utils.getTimestamp() }
				};
				this.tokenDb.remove(query, { multi: true }, err => {
					if (err) {
						console.error(err);
					}
				});

				// Insert new token
				var tokenData = {
					user: user._id,
					token: Utils.generateHash(),
					validity: Utils.getTimestamp() + this.tokenValidity
				};
				this.tokenDb.insert(tokenData, (err) => {
					if (err) {
						return reject(Errors.wrap(err));
					}
		
					resolve(Object.assign({
						token: tokenData.token,
						token_valid_until: tokenData.validity
					}, user));
				});

			});
		});
	}

	register(name, password, callback) {
		var userData = this.emptyUser(false);
		var pw = this.storage.encryptPassword(password);
		userData.name = name;
		userData.password = pw.passwordHash;
		userData.passwordSalt = pw.salt;
		this.db.insert(userData, (err, user) => {
			if (err) {
				return next(Errors.wrap(err));
			}

			callback(user);
		});
	}

	checkAuthToken(token) {
		return new Promise((resolve, reject) => {
			var query = {
				token: token.replace(/^basic\/\//, ''), // remove token prefix for basic
				validity: { $gt: Utils.getTimestamp() }
			};
			this.tokenDb.findOne(query, {}, (err, tokenFromDb) => {
				if (err) {
					reject(Errors.wrap(err));
				}
				else if (tokenFromDb === null) {
					reject(new Errors.AuthenticationRequired({
						reason: 'Token invalid or expired.'
					}));
				}
				else {
					this.db.findOne({_id: tokenFromDb.user}, {}, (err, user) => {
						if (err) {
							reject(Errors.wrap(err));
						}
						else if (user === null) {
							reject(new Errors.AuthenticationRequired({
								reason: 'User account got deleted.'
							}));
						}
						else {
							resolve(user);
						}
					});
				}
			});
		});
	}

};