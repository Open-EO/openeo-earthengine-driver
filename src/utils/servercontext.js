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

	processingContext(req) {
		return new ProcessingContext(this, req.user);
	}

}
