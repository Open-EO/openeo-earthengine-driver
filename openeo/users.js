const Utils = require('./utils');
const Errors = require('./errors');

module.exports = class UsersAPI {

	constructor() {
		this.db = Utils.loadDB('users');
	}

	beforeServerStart(server) {
		server.addEndpoint('get', '/credentials/basic', this.getCredentialsBasic.bind(this));
		server.addEndpoint('post', '/credentials', this.postCredentials.bind(this)); // Proprietary extension to register a user
		server.addEndpoint('get', '/me', this.getUserInfo.bind(this));

		return Promise.resolve();
	}

	checkAuthToken(token) {
		return new Promise((resolve, reject) => {
			this.db.findOne({ token: token }, {}, (err, user) => {
				if (err) {
					reject(new Errors.Internal(err));
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

	checkRequestAuthToken(req, res, next) {
		var token = null;
		if (req.authorization.scheme === 'Bearer') {
			token = req.authorization.credentials;
		}
		else {
			return next();
		}

		this.checkAuthToken(token).then(user => {
			req.user = user;
			next();
		})
		.catch(err => {
			res.send(err);
		});
	}

	getCredentialsBasic(req, res, next) {
		if (req.authorization.scheme != 'Basic') {
			return next(new Errors.AuthenticationSchemeInvalid());
		}

		var query = {
			_id: req.authorization.basic.username
		};
		this.db.findOne(query, (err, user) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (user === null) {
				return next(new Errors.AuthenticationRequired({
					reason: 'User not found'
				}));
			}

			var pw = Utils.hashPassword(req.authorization.basic.password, user.passwordSalt);
			if (pw.passwordHash !== user.password) {
				return next(new Errors.AuthenticationRequired({
					reason: 'Password invalid'
				}));
			}

			user.token = Utils.generateHash();
			user.tokenTime = Utils.getTimestamp();
			req.user = user;
			var dataToUpdate = {
				token: user.token,
				tokenTime: user.tokenTime
			};
			this.db.update({ _id: req.authorization.basic.username }, { $set: dataToUpdate }, {}, (err, numReplaced) => {
				if (numReplaced !== 1) {
					return next(new Errors.Internal(err));
				}

				res.json({
					user_id: user._id,
					access_token: user.token
				});
				return next();
			});
		});
	}

	postCredentials(req, res, next) {
		if (typeof req.body.password !== 'string' || req.body.password.length < 6) {
			return next(new Errors.PasswordInsecure());
		}

		var userData = this.emptyUser(false);
		var pw = Utils.encryptPassword(req.body.password);
		userData.password = pw.passwordHash;
		userData.passwordSalt = pw.salt;
		this.db.insert(userData, (err, user) => {
			if (err) {
				return next(new Errors.Internal(err));
			}

			res.json({
				user_id: user._id
			});
			return next();
		});
	}

	getUserInfo(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		res.json({
			user_id: req.user._id,
			storage: null,
			budget: null,
			links: []
		});
		return next();
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

};