const Errors = require('../errors');
const checkDiskSpace = require('check-disk-space');

module.exports = class UsersAPI {

	constructor(context) {
		this.storage = context.users();
		this.context = context; 
	}

	beforeServerStart(server) {
		server.addEndpoint('get', '/credentials/basic', this.getCredentialsBasic.bind(this));
//		server.addEndpoint('get', '/credentials/oidc', this.getCredentialsOidc.bind(this));
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

//	getCredentialsOidc(req, res, next) {
//		res.redirect('https://accounts.google.com/.well-known/openid-configuration', next);
//	}

	getCredentialsBasic(req, res, next) {
		if (!req.authorization.scheme) {
			return next(new Errors.AuthenticationRequired());
		}
		else if (req.authorization.scheme != 'Basic') {
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
				return next(Errors.wrap(err));
			}

			res.json({
				user_id: user._id
			});
			return next();
		});
	}

	async getUserInfo(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var data = {
			user_id: req.user._id,
			budget: null,
			links: [
				{
					href: "https://code.earthengine.google.com",
					rel: "editor",
					title: "Earth Engine Code Editor"
				},
				{
					href: "https://developers.google.com/earth-engine/datasets/",
					rel: "datasets",
					title: "Earth Engine Catalog"
				},
				{
					href: "https://earthengine.google.com/faq/",
					rel: "about",
					title: "Earth Engine FAQ"
				}
			]
		};
		if (this.context.diskUsagePath !== null) {
			try {
				var info = await checkDiskSpace(this.context.diskUsagePath);
				data.storage = {
					free: info.free,
					quota: info.size
				};
			} catch (e) {
				console.warn(e);
			}
		}
		res.json(data);
		return next();
	}

};