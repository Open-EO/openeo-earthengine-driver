import Errors from '../utils/errors.js';
import checkDiskSpace from 'check-disk-space';

export default class UsersAPI {

	constructor(context) {
		this.storage = context.users();
		this.context = context;
	}

	beforeServerStart(server) {
		server.addEndpoint('get', '/credentials/basic', this.getCredentialsBasic.bind(this));
		server.addEndpoint('get', '/credentials/oidc', this.getCredentialsOidc.bind(this));
		server.addEndpoint('get', '/me', this.getUserInfo.bind(this));

		return Promise.resolve();
	}

	async checkRequestAuthToken(req, res) {
		let token = null;
		if (req.authorization.scheme === 'Bearer') {
			token = req.authorization.credentials;
		}
		else {
			return;
		}

		try {
			req.user = await this.storage.checkToken(token);
		} catch(err) {
			res.send(Errors.wrap(err));
		}
	}

	async getCredentialsOidc(req, res) {
		if (!this.context.authClients) {
			throw new Errors.FeatureUnsupported();
		}

		res.send({
			"providers": [
				{
					id: "sample",
					issuer: this.storage.oidcIssuer,
					title: "Sample OIDC Provider",
					description: "Login with your OIDC provider account.",
					scopes: this.storage.oidcScopes,
					default_clients: this.context.authClients
				}
			]
		});
	}

	async getCredentialsBasic(req, res) {
		//if (!this.context.serviceAccountCredentialsFile) {
		//	throw new Errors.FeatureUnsupported();
		//}else
		if (!req.authorization.scheme) {
			throw new Errors.AuthenticationRequired();
		}
		else if (req.authorization.scheme !== 'Basic') {
			throw new Errors.AuthenticationSchemeInvalid();
		}

		const user = await this.storage.login(req.authorization.basic.username, req.authorization.basic.password);
		req.user = user;
		res.json({
			access_token: user.token,
			access_token_valid_until: user.token_valid_until
		});
	}

	async getUserInfo(req, res) {
		if (!req.user._id) {
			throw new Errors.AuthenticationRequired();
		}
		const data = {
			user_id: req.user._id,
			name: req.user.name,
			email: req.user.email || null,
			budget: null
		};
		if (this.context.diskUsagePath !== null) {
			try {
				const info = await checkDiskSpace(this.context.diskUsagePath);
				data.storage = {
					free: info.free,
					quota: info.size
				};
			} catch (e) {
				if (this.context.debug) {
					console.warn(e);
				}
			}
		}
		res.json(data);
	}

}
