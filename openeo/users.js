const Utils = require('./utils');

var Users = {

	db: null,

	init() {
		this.db = Utils.loadDB('users');
		console.log("INFO: Users loaded.");
		return new Promise((resolve, reject) => resolve());
	},

	routes(server) {
		server.addEndpoint('get', '/auth/login', this.getLogin.bind(this));
		server.addEndpoint('post', '/auth/register', this.postRegister.bind(this));
		server.addEndpoint('get', '/users/{user_id}/credits', this.getUserCredits.bind(this));
	},

	checkAuthToken(req, res, next) {
		req.user = this.emptyUser();
		var token = null;
		var route = req.getRoute();
		if (req.authorization.scheme === 'Bearer') {
			token = req.authorization.credentials;
		}
		else if (route.path == '/subscription' && typeof req.query.authorization === 'string') {
			token = req.query.authorization;
		}
		else {
			return next();
		}

		this.db.findOne({ token: token }, (err, user) => {
			if (err || user === null) {
				res.send(403);
				return; // token is invalid => finish handling this request, so don't call next!
			}

			// ToDo: Expire token

			// Update token time
			user.tokenTime = Utils.getTimestamp();
			this.db.update({ token: token }, { $set: { tokenTime: user.tokenTime } }, {});

			req.user = user;
			return next();
		});
	},

	getLogin(req, res, next) {
		if (req.authorization.scheme == 'Basic') {
			var query = {
				_id: req.authorization.basic.username
			};
			this.db.findOne(query, (err, user) => {
				if (user === null) {
					res.send(403, err); // User not found
					return next();
				}
				else {
					var pw = Utils.hashPassword(req.authorization.basic.password, user.passwordSalt);
					if (pw.passwordHash !== user.password) {
						res.send(403); // Password invalid
						return next();
					}

					user.token = Utils.generateHash();
					user.tokenTime = Utils.getTimestamp();
					req.user = user;
					var dataToUpdate = {
						token: user.token,
						tokenTime: user.tokenTime
					};
					this.db.update({ _id: req.authorization.basic.username }, { $set: dataToUpdate }, {}, (err, numReplaced) => {
						if (numReplaced === 1) {
							res.json({
								user_id: user._id,
								token: user.token
							});
							return next();
						}
						else {
							console.log(err);
							res.send(500, err);
							return next();
						}
					});
				}
			});
		}
		else {
			res.send(403, "Invalid authentication scheme.");
			return next();
		}
	},

	postRegister(req, res, next) {
		if (typeof req.body.password !== 'string' || req.body.password.length < 6) {
			res.send(420);
			return next();
		}

		var userData = this.emptyUser(false);
		var pw = Utils.encryptPassword(req.body.password);
		userData.password = pw.passwordHash;
		userData.passwordSalt = pw.salt;
		this.db.insert(userData, (err, user) => {
			if (err) {
				console.log(err);
				res.send(500, err);
				return next();
			}
			else {
				res.json({
					user_id: user._id
				});
				return next();
			}
		});
	},

	getUserCredits(req, res, next) {
		res.header('content-type', 'text/plain');
		res.send(200, req.user.credits.toString());
		return next();
	},

	emptyUser(withId = true) {
		var user = {
			password: null,
			passwordSalt: null,
			token: null,
			tokenExpiry: 0,
			credits: 0
		};
		if (withId) {
			user._id = false;
		}
		return user;
	}

};

module.exports = Users;
