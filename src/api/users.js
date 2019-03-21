const Errors = require('../errors');

module.exports = class UsersAPI {

	constructor(context) {
		this.storage = context.users();
		this.context = context;
	}

	beforeServerStart(server) {
		server.addEndpoint('get', '/credentials/basic', this.getCredentialsBasic.bind(this));
		server.addEndpoint('post', '/credentials', this.postCredentials.bind(this)); // Proprietary extension to register a user
		server.addEndpoint('get', '/me', this.getUserInfo.bind(this));

		return Promise.resolve();
	}

	checkRequestAuthToken(req, res, next) {
		var token = null;
		if (req.authorization.scheme === 'Bearer') {
			token = req.authorization.credentials;
		}
		else {
			return next();
		}

		this.storage.checkAuthToken(token).then(user => {
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

		this.storage.login(req.authorization.basic.username, req.authorization.basic.password).then(user => {
			req.user = user;
			res.json({
				user_id: user._id,
				access_token: user.token
			});
			return next();
		}).catch(e => next(e));
	}

	postCredentials(req, res, next) {
		if (typeof req.body.password !== 'string' || req.body.password.length < 6) {
			return next(new Errors.PasswordInsecure());
		}

		var userData = this.emptyUser(false);
		var pw = this.storage.encryptPassword(req.body.password);
		userData.password = pw.passwordHash;
		userData.passwordSalt = pw.salt;
		this.storage.database().insert(userData, (err, user) => {
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

};