import Utils from './utils.js';
import HttpUtils from './http.js';
import Errors from './errors.js';
import fse from 'fs-extra';

export default class ProcessingContext {

	constructor(serverContext, user = null) {
		this.serverContext = serverContext;
		this.user = user;
		this.userId = user ? user._id : null;
		this.ee = Utils.require('@google/earthengine');
		this.eePrivateKey = null;
	}

	async connectGee(forcePrivateKey = false) {
		const user = this.getUser();
		const ee = this.ee;
		if (!forcePrivateKey && typeof this.userId === 'string' && this.userId.startsWith("google-")) {
			console.log("Authenticate via user token");
			const expires = 59 * 60;
			// todo auth: get expiration from token and set more parameters #82
			ee.apiclient.setAuthToken(null, 'Bearer', user.token, expires, [], null, false, false);
		}
		else if (this.serverContext.serviceAccountCredentialsFile) {
			console.log("Authenticate via private key");
			if (!this.eePrivateKey) {
				this.eePrivateKey = await fse.readJson(this.serverContext.serviceAccountCredentialsFile);
			}
			if (!Utils.isObject(this.eePrivateKey)) {
				console.error("ERROR: GEE private key not found.");
			}
			await new Promise((resolve, reject) => {
				ee.data.authenticateViaPrivateKey(
					this.eePrivateKey,
					() => resolve(),
					error => reject("ERROR: GEE Authentication failed: " + error.message)
				);
			});
		}
		else {
			throw new Error("No authentication method available, must have at least a private key configured.");
		}

		await ee.initialize();
		return ee;
	}

	server() {
		return this.serverContext;
	}

	getCollection(id) {
		return this.serverContext.collections().getData(id);
	}

	getStoredProcessGraph(id) { // returns promise
		return this.serverContext.storedProcessGraphs().getById(id);
	}

	getJob(jobId) { // returns promise
		return this.serverContext.jobs().getById(jobId);
	}

	isFileFromWorkspace(file) { // returns promise
		const p = this.workspace.getPath(this.userId, file);
		if (!p) {
			throw new Errors.FilePathInvalid();
		}
		return Promise.resolve(HttpUtils.isFile(p));
	}

	readFileFromWorkspace(file) { // returns promise
		return this.serverContext.files().getFileContents(this.userId, file);
	}

	getVariable(id) {
		return this.variables[id];
	}

	setUserId(userId) {
		this.userId = userId;
	}

	getUserId() {
		return this.userId;
	}

	getUser() {
		return this.user;
	}

}
