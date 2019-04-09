const CapabilitiesAPI = require('./src/api/capabilities');
const CollectionsAPI = require('./src/api/collections');
const FilesAPI = require('./src/api/files');
const JobsAPI = require('./src/api/jobs');
const ProcessesAPI = require('./src/api/processes');
const ProcessGraphsAPI = require('./src/api/storedprocessgraphs');
const ServicesAPI = require('./src/api/services');
const SubscriptionsAPI = require('./src/api/subscriptions');
const UsersAPI = require('./src/api/users');

const Utils = require('./src/utils');
const ServerContext = require('./src/servercontext');

const fse = require('fs-extra');
const restify = require('restify');
global.ee = require('@google/earthengine');

class Server {

	constructor() {
		console.info('Initializing openEO Google Earth Engine driver...');

		this.http_server = null;
		this.https_server = null;
		this.afterServerStartListener = [];

		this.serverOptions = {
			handleUpgrades: true,
			ignoreTrailingSlash: true
		};
		this.corsExposeHeaders = 'OpenEO-Identifier, OpenEO-Costs';

		this.serverContext = new ServerContext();

		this.api = {};
		this.api.capabilities = new CapabilitiesAPI(this.serverContext);
		this.api.collections = new CollectionsAPI(this.serverContext);
		this.api.processes = new ProcessesAPI(this.serverContext);
		this.api.files = new FilesAPI(this.serverContext);
		this.api.jobs = new JobsAPI(this.serverContext);
		this.api.services = new ServicesAPI(this.serverContext);
		this.api.subscriptions = new SubscriptionsAPI(this.serverContext);
		this.api.users = new UsersAPI(this.serverContext);
		this.api.processGraphs = new ProcessGraphsAPI(this.serverContext);

		const privateKey = fse.readJsonSync(this.serverContext.serviceAccountCredentialsFile);
		ee.data.authenticateViaPrivateKey(privateKey,
			() => { 
				console.info("GEE Authentication succeeded.");
				ee.initialize();
				this.startServer();
			},
			(error) => {
				console.error("ERROR: GEE Authentication failed: " + error);
				process.exit(1);
			}
		);
	}

	addEndpoint(method, path, callback, root = false) {
		if (!Array.isArray(path)) {
			path = [path, path.replace(/\{([\w]+)\}/g, ":$1")];
		}

		if (!root) {
			this.api.capabilities.addEndpoint(method, path[0]);
		}
		var apiPath = root ? '' : this.serverContext.apiPath;

		if (method === 'delete') {
			method = 'del';
		}

		this.http_server[method](apiPath + path[1], callback);
		if (this.isHttpsEnabled()) {
			this.https_server[method](apiPath + path[1], callback);
		}
	}

	addAfterServerStartListener(callback) {
		this.afterServerStartListener.push(callback);
	}

	afterServerStart() {
		for(var i in this.afterServerStartListener) {
			this.afterServerStartListener[i](this);
		}
	}

	beforeServerStart() {
		let p = [];
		for(var i in this.api) {
			p.push(this.api[i].beforeServerStart(this));
		}
		return Promise.all(p);
	}

	isHttpsEnabled() {
		return (this.serverContext.ssl && this.serverContext.ssl.port > 0 && typeof this.serverContext.ssl.key === 'string' && typeof this.serverContext.ssl.certificate === 'string') ? true : false;
	}

	initHttpServer() {
		this.http_server = restify.createServer(this.serverOptions);
		this.initServer(this.http_server);
	}

	initHttpsServer() {
		if (this.isHttpsEnabled()) {
			var https_options = Object.assign({}, this.serverOptions, {
				key: fse.readFileSync(this.serverContext.ssl.key),
				certificate: fse.readFileSync(this.serverContext.ssl.certificate)
			});
			this.https_server = restify.createServer(https_options);
			this.initServer(this.https_server);
		}
	}

	initServer(server) {
		server.pre(this.preflight.bind(this));
		server.use(this.populateGlobals.bind(this));
		server.use(restify.plugins.queryParser());
		server.use(restify.plugins.bodyParser());
		server.use(restify.plugins.authorizationParser());
		server.use(this.injectCorsHeader.bind(this));
		server.use(this.api.users.checkRequestAuthToken.bind(this.api.users));
		if (this.serverContext.debug) {
			server.use(this.logRequest.bind(this));
		}
	}

	createSubscriptions(topics) {
		for(let i in topics) {
			this.serverContext.subscriptions().registerTopic(topics[i]);
		}
	}

	populateGlobals(req, res, next) {
		req.user = this.serverContext.users().emptyUser();
		req.serverContext = this.serverContext;
		return next();
	}

	startServer() {
		this.initHttpServer();
		this.initHttpsServer();

		this.beforeServerStart()
		.then(() => this.startServerHttp())
		.then(() => this.startServerHttps())
		.then(() => this.afterServerStart())
		.catch(e => {
			console.error('Server not started due to the following error: ');
			console.error(e);
			process.exit(1);
		});

	}

	startServerHttp() {
		return new Promise((resolve, reject) => {
			const port = process.env.PORT || this.serverContext.port;
			this.http_server.listen(port, () => {
				var exposePortStr = this.serverContext.exposePort != 80 ? ":" + this.serverContext.exposePort : "";
				Utils.serverUrl = "http://" + this.serverContext.hostname + exposePortStr;
				Utils.apiPath = this.serverContext.apiPath;
				console.info('HTTP-Server listening at %s', Utils.getApiUrl());
				resolve();
			});
		});
	}

	startServerHttps() {
		return new Promise((resolve, reject) => {
			if (this.isHttpsEnabled()) {
				var sslport = process.env.SSL_PORT || this.serverContext.ssl.port;
				this.https_server.listen(sslport, () => {
					var exposePortStr = this.serverContext.ssl.exposePort != 443 ? ":" + this.serverContext.ssl.exposePort : "";
					Utils.serverUrl = "https://" + this.serverContext.hostname + exposePortStr;
					Utils.apiPath = this.serverContext.apiPath;
					console.info('HTTPS-Server listening at %s', Utils.getApiUrl());
					resolve();
				});
			}
			else {
				console.warn('HTTPS not enabled.');
				resolve();
			}
		});
	}

	logRequest(req, res, next) {
		console.log("Requested: " + req.getRoute().method + " " + req.href());
		next();
	}

	injectCorsHeader(req, res, next) {
		if (!req.headers['origin']) {
			return next();
		}

		res.setHeader('access-control-allow-origin', req.headers['origin']);
		res.setHeader('access-control-allow-credentials', 'true');
		res.setHeader('access-control-expose-headers', this.corsExposeHeaders);
		return next();
	}

	preflight(req, res, next) {
		if (req.method !== 'OPTIONS') {
			return next();
		}

		res.once('header', () => {
			res.header('access-control-allow-origin', req.headers['origin'])
			res.header('access-control-allow-credentials', 'true')
			res.header('access-control-expose-headers', this.corsExposeHeaders);
			res.header('access-control-allow-methods', 'OPTIONS, GET, POST, PATCH, PUT, DELETE');
			res.header('access-control-allow-headers', 'Authorization, Content-Type');
		});

		res.send(204);
		// Don't call next, this ends execution, nothing more to send.
	}

};

global.server = new Server();