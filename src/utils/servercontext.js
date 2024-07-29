import Config from './config.js';
import GeeProcessRegistry from '../processgraph/registry.js';
import ProcessingContext from './processingcontext.js';
import Utils from './utils.js';

import DataCatalog from '../models/catalog.js';
import ProcessGraphStore from '../models/processgraphstore.js';
import FileWorkspace from '../models/workspace.js';
import JobStore from '../models/jobstore.js';
import UserStore from '../models/userstore.js';
import ServiceStore from '../models/servicestore.js';

import fse from 'fs-extra';

export default class ServerContext extends Config {

	constructor() {
		super();
		this.processRegistry = new GeeProcessRegistry(this);
		this.dataCatalog = new DataCatalog(this);
		this.processGraphStore = new ProcessGraphStore();
		this.fileWorkspace = new FileWorkspace();
		this.jobStore = new JobStore();
		this.userStore = new UserStore(this);
		this.serviceStore = new ServiceStore();
		this.taskMonitors = {};
		this.eePrivateKey = null;
		this.loadPrivateKey();
	}

	loadPrivateKey() {
		if (!this.serviceAccountCredentialsFile || this.eePrivateKey) {
			return;
		}
		try {
			this.eePrivateKey = fse.readJSONSync(this.serviceAccountCredentialsFile);
			if (!Utils.isObject(this.eePrivateKey)) {
				console.error("ERROR: GEE private key invalid.");
			}
		} catch (error) {
			console.error("ERROR: GEE private key not provided. " + error.message);
		}
	}

	jobs() {
		return this.jobStore;
	}

	files() {
		return this.fileWorkspace;
	}
	processes() {
		return this.processRegistry;
	}

	storedProcessGraphs() {
		return this.processGraphStore;
	}

	collections() {
		return this.dataCatalog;
	}

	users() {
		return this.userStore;
	}

	webServices() {
		return this.serviceStore;
	}

	getFormat(format, type) {
		if (typeof format !== 'string') {
			return null;
		}
		const ucFormat = format.toUpperCase();
		const varName = `${type}Formats`;
		if (!this[varName] || !this[varName][ucFormat]) {
			return null;
		}
		return this[varName][ucFormat];
	}

	getOutputFormat(format) {
		return this.getFormat(format, 'output');
	}

	getInputFormat(format) {
		return this.getFormat(format, 'input');
	}

	isValidServiceType(service_type) {
		return (typeof service_type === 'string' && Utils.isObject(this.services[service_type.toLowerCase()]));
	}

	processingContext(user, parentResource = null) {
		return new ProcessingContext(this, user, parentResource);
	}

	addTaskMonitor(userId, monitorId) {
		this.taskMonitors[userId] = monitorId;
	}

	removeTaskMonitor(userId) {
		if (userId in this.taskMonitors) {
			clearTimeout(this.taskMonitors[userId]);
			delete this.taskMonitors[userId];
		}
	}

}
