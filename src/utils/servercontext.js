import Config from './config.js';
import GeeProcessRegistry from '../processgraph/registry.js';
import ProcessingContext from '../processgraph/context.js';
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
		this.userStore = new UserStore();
		this.serviceStore = new ServiceStore();
		this.tempFolder = './storage/temp_files';
		if (this.serviceAccountCredentialsFile) {
			this.geePrivateKey = fse.readJsonSync(this.serviceAccountCredentialsFile);
		}
		else {
			this.geePrivateKey = null;
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

	getTempFolder() {
		return this.tempFolder;
	}

	isValidOutputFormat(format) {
		return (typeof format === 'string' && Utils.isObject(this.outputFormats[format.toUpperCase()]));
	}

	isValidInputFormat(format) {
		return (typeof format === 'string' && Utils.isObject(this.inputFormats[format.toUpperCase()]));
	}

	isValidServiceType(service_type) {
		return (typeof service_type === 'string' && Utils.isObject(this.services[service_type.toLowerCase()]));
	}

	processingContext(req) {
		return new ProcessingContext(this, req.user);
	}

}
