const Config = require('./config');
const GeeProcessRegistry = require('./processgraph/registry');
const ProcessingContext = require('./processgraph/context');
const SubscriptionPool = require('./subscriptions/pool');
const Utils = require('./utils');

const DataCatalog = require('./models/catalog');
const ProcessGraphStore = require('./models/processgraphstore');
const FileWorkspace = require('./models/workspace');
const JobStore = require('./models/jobstore');
const UserStore = require('./models/userstore');
const ServiceStore = require('./models/servicestore');

module.exports = class ServerContext extends Config {

	constructor() {
		super();
		this.processRegistry = new GeeProcessRegistry(this);
		this.dataCatalog = new DataCatalog();
		this.processGraphStore = new ProcessGraphStore();
		this.fileWorkspace = new FileWorkspace();
		this.jobStore = new JobStore();
		this.subscriptionPool = new SubscriptionPool();
		this.userStore = new UserStore();
		this.serviceStore = new ServiceStore();
		this.tempFolder = './storage/temp_files';
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

	subscriptions() {
		return this.subscriptionPool;
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

	isValidServiceType(service_type) {
		return (typeof service_type === 'string' && Utils.isObject(this.services[service_type.toLowerCase()]));
	}

	processingContext(req) {
		return new ProcessingContext(this, req.user._id);
	}

};