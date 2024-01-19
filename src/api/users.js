import Errors from '../utils/errors.js';
import checkDiskSpace from 'check-disk-space';

export default class UsersAPI {

	constructor(context) {
		this.storage = context.users();
		this.context = context;
	}

	beforeServerStart(server) {
		server.addEndpoint('get', '/credentials/basic', this.getCredentialsBasic.bind(this));
		if (this.context.googleAuthClients) {
			server.addEndpoint('get', '/credentials/oidc', this.getCredentialsOidc.bind(this));
		}
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
			req.user = await this.storage.checkAuthToken(token);
		} catch(err) {
			res.send(Errors.wrap(err));
		}
	}

	async getCredentialsOidc(req, res) {
		if (!this.context.googleAuthClients) {
			throw new Errors.FeatureUnsupported();
		}

		res.send({
			"providers": [
				{
					id: "google",
					issuer: "https://accounts.google.com",
					title: "Google",
					description: "Login with your Google Earth Engine account.",
					scopes: [
						"openid",
						"email",
						"https://www.googleapis.com/auth/earthengine",
						// "https://www.googleapis.com/auth/cloud-platform",
						// "https://www.googleapis.com/auth/devstorage.full_control"
					],
					default_clients: this.context.googleAuthClients
				}
			]
		});
	}

	async getCredentialsBasic(req, res) {
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
