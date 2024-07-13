import Utils from '../utils/utils.js';
import DB from '../utils/db.js';
import Errors from '../utils/errors.js';
import crypto from "crypto";
import HttpUtils from '../utils/http.js';
import fse from 'fs-extra';

export default class UserStore {

	constructor(context) {
		this.serverContext = context;

		this.db = DB.load('users');

		this.tokenDb = DB.load('token');
		this.tokenValidity = 24*60*60;

		this.oidcUserInfoEndpoint = null;
		this.oidcIssuer = 'https://accounts.google.com';
		this.oidcScopes = [
			"openid",
			"email",
			"https://www.googleapis.com/auth/earthengine",
			// "https://www.googleapis.com/auth/cloud-platform",
			// "https://www.googleapis.com/auth/devstorage.full_control"
		];
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
		const hash = crypto.createHmac('sha512', salt);
		hash.update(password);
		return {
			salt: salt,
			passwordHash: hash.digest('hex')
		};
	}

	emptyUser(withId = true) {
		const user = {
			name: null,
			email: null,
			password: null,
			passwordSalt: null
		};
		if (withId) {
			user._id = false;
		}
		return user;
	}

	async login(username, password) {
		const query = {
			name: username
		};
		const user = await this.db.findOne(query);
		if (user === null) {
			throw new Errors.AuthenticationRequired({
				reason: 'User not found'
			});
		}

		const input = this.hashPassword(password, user.passwordSalt);
		if (input.passwordHash !== user.password) {
			throw new Errors.AuthenticationRequired({
				reason: 'Password invalid'
			});
		}

		const token = await this.updateToken(user);
		return Object.assign({}, user, token);
	}

	async updateToken(user) {
		// Delete old token
		const query = {
			validity: { $lt: Utils.getTimestamp() }
		};
		await this.tokenDb.remove(query, { multi: true });

		// Insert new token
		const tokenData = {
			user: user._id,
			token: Utils.generateHash(),
			validity: Utils.getTimestamp() + this.tokenValidity
		};
		await this.tokenDb.insert(tokenData);

		return {
			token: tokenData.token,
			token_valid_until: tokenData.validity
		};
	}

	async get(name) {
		return await this.db.findOneAsync({ name });
	}

	async exists(name) {
		return (await this.get(name) !== null);
	}

	async all() {
		return await this.db.findAsync({}).sort({ name: 1 });
	}

	async remove(name) {
		let user = await this.get(name);
		let user_id;
		if (user !== null) {
			user_id = user._id;
			await this.db.removeAsync({ _id: user_id});
			console.log('- Removed user from database');
		}
		else {
			user_id = name;
		}

		try {
			const pgDb = this.serverContext.storedProcessGraphs().database();
			await pgDb.removeAsync({user_id});
			console.log('- Removed process graphs from database');
		} catch (err) {
			console.error('- Error removing process graphs:', err);
		}

		try {
			const serviceModel = this.serverContext.webServices();
			const serviceDb = serviceModel.database();
			const services = await serviceDb.findAsync({user_id});
			await serviceDb.removeAsync({user_id});
			console.log('- Removed web services from database');

			await Promise.all(services.map(service => serviceModel.removeLogsById(service._id)));
			console.log('- Removed web services logs from file system');
		} catch (err) {
			console.error('- Error removing web services:', err);
		}

		try {
			const jobModel = this.serverContext.jobs();
			const jobDb = jobModel.database();
			const jobs = await jobDb.findAsync({user_id});
			await jobDb.removeAsync({user_id});
			console.log('- Removed batch jobs from database');

			await Promise.all(jobs.map(job => job.removeResults(job._id)));
			console.log('- Removed batch job results and logs from file system');
		} catch (err) {
			console.error('- Error removing jobs:', err);
		}

		try {
			const fileFolder = this.serverContext.files().getUserFolder(user_id);
			await fse.remove(fileFolder);
			console.log('- Removed user files from file system');
		} catch (err) {
			console.error('- Error removing user files:', err);
		}
	}

	async register(name, password, email = null) {
		const userData = this.emptyUser(false);
		const pw = this.encryptPassword(password);
		userData.name = name;
		userData.email = email;
		userData.password = pw.passwordHash;
		userData.passwordSalt = pw.salt;
		return await this.db.insertAsync(userData);
	}

	async authenticateBasic(token) {
		const query = {
			token,
			validity: { $gt: Utils.getTimestamp() }
		};

		const tokenFromDB = await this.tokenDb.findOneAsync(query);
		if (tokenFromDB === null) {
			throw new Errors.AuthenticationRequired({
				reason: 'Token invalid or expired.'
			});
		}

		const user = await this.db.findOne({_id: tokenFromDB.user});
		if (user === null) {
			throw new Errors.AuthenticationRequired({
				reason: 'User account has been removed.'
			});
		}
		return user;
	}

	async authenticateGoogle(token) {
		const userInfo = await this.getOidcUserInfo(token);
		const userData = this.emptyUser(false);
		userData._id = "google_" + userInfo.sub;
		userData.name = userInfo.name || userInfo.email || null;
		userData.email = userInfo.email || null;
		userData.token = token;
		// Googles tokens are valid for roughly an hour, so we set it slightly lower
		userData.token_valid_until = Utils.getTimestamp() + 59 * 60;
		// todo auth: database handling for less OIDC userInfo requests #82
		return userData;
	}

	async checkAuthToken(apiToken) {
		const parts = apiToken.split('/', 3);
		if (parts.length !== 3) {
			throw new Errors.AuthenticationRequired({
				reason: 'Token format invalid.'
			});
		}
		const [type, provider, token] = parts;

		if (type === 'basic') {
			return this.authenticateBasic(token);
		}
		else if (type === 'oidc') {
			if (provider === 'google') {
				return this.authenticateGoogle(token);
			}
			else {
				throw new Errors.AuthenticationRequired({
					reason: 'Identity provider not supported.'
				});
			}
		}
		else {
			throw new Errors.AuthenticationRequired({
				reason: 'Authentication method not supported.'
			});
		}
	}

	async getOidcUserInfoEndpoint() {
		if (this.oidcUserInfoEndpoint === null) {
			try {
				const url = this.oidcIssuer + '/.well-known/openid-configuration';
				const doc = await HttpUtils.get(url);
				this.oidcUserInfoEndpoint = doc.userinfo_endpoint || null;
			} catch (err) {
				throw new Errors.Internal({
					message: 'Can not retrieve OIDC well-known document: ' + err.message
				});
			}
		}
		return this.oidcUserInfoEndpoint;
	}

	async getOidcUserInfo(token) {
		const endpoint = await this.getOidcUserInfoEndpoint();
		if (endpoint) {
			return HttpUtils.get(endpoint, {Authorization: `Bearer ${token}`});
		}
		else {
			throw new Errors.Internal({
				message: 'Can not retrieve user information from Google.'
			});
		}
	}

}
