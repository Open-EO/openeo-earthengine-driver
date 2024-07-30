import Utils from './utils.js';

export default class ProcessingContext {

	constructor(serverContext, user = null, parentResource = null) {
		this.serverContext = serverContext;
		this.user = user;
		this.userId = user ? user._id : null;
		this.googleUserId = '';
		this.parentResource = parentResource;
		this.ee = Utils.require('@google/earthengine');
		this.taskMonitorId = null;
		this.connected = false;
	}

	async connect(forcePrivateKey = false) {
		if (this.connected) {
			return this.ee;
		}

		const user = this.getUser();
		const ee = this.ee;
		if (!forcePrivateKey && Utils.isGoogleUser(this.userId)) {
			console.log("Authenticate via user token");
			const expires = 59 * 60;
			// todo auth: get expiration from token and set more parameters #82
			ee.apiclient.setAuthToken(null, 'Bearer', user.token, expires, [], null, false, false);
			this.googleUserId = this.userId;
		}
		else if (this.serverContext.eePrivateKey) {
			console.log("Authenticate via private key");
			await new Promise((resolve, reject) => {
				ee.data.authenticateViaPrivateKey(
					this.serverContext.eePrivateKey,
					() => resolve(),
					error => reject("ERROR: GEE Authentication failed: " + error.message)
				);
			});
		}
		else {
			throw new Error("No authentication method available, must have at least a private key configured.");
		}

		await ee.initialize();
		this.connected = true;
		return ee;
	}

	server() {
		return this.serverContext;
	}

	getCollection(id) {
		return this.serverContext.collections().getData(id);
	}

	getResource() {
		return this.parentResource;
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

	getGoogleUserId() {
		return Utils.isGoogleUser(this.userId) ? this.userId : '';
	}

	startTaskMonitor() {
		const googleUserId = this.getGoogleUserId();
		this.serverContext.removeTaskMonitor(googleUserId);
		this.taskMonitorId = setTimeout(this.monitorTasks.bind(this), 60 * 1000);
		this.serverContext.addTaskMonitor(googleUserId, this.taskMonitorId);
		this.monitorTasks();
	}

	async monitorTasks() {
		const jobModel = this.serverContext.jobs();
		const taskCount = await this.serverContext.jobs().getTaskCount(this.getGoogleUserId());
		if (taskCount === 0) {
			// Nothing to monitor
			return;
		}
		try {
			await this.connect();
			this.ee.data.listOperations(null, ops => jobModel.updateTasks(ops));
		} catch (e) {
			this.serverContext.removeTaskMonitor(this.googleUserId);
			console.error(e);
		}
	}

}
