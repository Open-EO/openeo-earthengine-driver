import Utils from '../utils/utils.js';
import DB from '../utils/db.js';
import Errors from '../utils/errors.js';
import crypto from "crypto";

export default class UserStore {

	constructor() {
		this.db = DB.load('users');
		this.tokenDb = DB.load('token');
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

	async exists(name) {
		const user = await this.db.findOneAsync({ name });
		return user !== null;
	}

	async register(name, password) {
		const userData = this.emptyUser(false);
		const pw = this.encryptPassword(password);
		userData.name = name;
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
		const userData = this.emptyUser(false);
		userData._id = "google-" + Utils.generateHash(8);
		userData.token = token;
		// Googles tokens are valid for roughly an hour, so we set it slightly lower
		userData.token_valid_until = Utils.getTimestamp() + 59 * 60;
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

}
