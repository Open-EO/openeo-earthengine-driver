const CapabilitiesAPI = require('./openeo/capabilities');
const CollectionsAPI = require('./openeo/collections');
const FilesAPI = require('./openeo/files');
const JobsAPI = require('./openeo/jobs');
const ProcessesAPI = require('./openeo/processes');
const ProcessGraphsAPI = require('./openeo/processGraphs');
const ServicesAPI = require('./openeo/services');
const SubscriptionsAPI = require('./openeo/subscriptions');
const UsersAPI = require('./openeo/users');

const Config = require('./openeo/config');
const ProcessRegistry = require('./openeo/processRegistry');
const Utils = require('./openeo/utils');
const fse = require('fs-extra');
const restify = require('restify');
global.ee = require('@google/earthengine');

class Server {

	constructor() {
		console.log('Initializing openEO Google Earth Engine driver...');

		this.http_server = null;
		this.https_server = null;
		this.config = new Config();
		this.processRegistry = new ProcessRegistry();
		for(var i in this.config.processes) {
			this.processRegistry.add(this.config.processes[i]);
		}

		this.serverOptions = {
			handleUpgrades: true,
			ignoreTrailingSlash: true
		};
		this.corsExposeHeaders = 'OpenEO-Identifier, OpenEO-Costs';

		this.api = {};
		this.api.capabilities = new CapabilitiesAPI(this.config);
		this.api.collections = new CollectionsAPI();
		this.api.processes = new ProcessesAPI();
		this.api.files = new FilesAPI();
		this.api.jobs = new JobsAPI();
		this.api.services = new ServicesAPI()  ;
		this.api.subscriptions = new SubscriptionsAPI();
		this.api.users = new UsersAPI();
		this.api.processGraphs = new ProcessGraphsAPI();

		const privateKey = fse.readJsonSync(this.config.serviceAccountCredentialsFile);
		ee.data.authenticateViaPrivateKey(privateKey,
			() => { 
				console.log("GEE Authentication succeeded.");
				ee.initialize();
				this.startServer();
			},
			(error) => {
				console.log("ERROR: GEE Authentication failed: " + error);
				process.exit(1);
			}
		);
	}

	addEndpoint(method, path, callback) {
		if (!Array.isArray(path)) {
			path = [path, path.replace(/\{([\w]+)\}/g, ":$1")];
		}

		this.api.capabilities.addEndpoint(method, path[0]);

		if (method === 'delete') {
			method = 'del';
		}

		this.http_server[method](this.config.apiPath + path[1], callback);
		if (this.isHttpsEnabled()) {
			this.https_server[method](this.config.apiPath + path[1], callback);
		}
	}

	isHttpsEnabled() {
		return (this.config.ssl && this.config.ssl.port > 0 && typeof this.config.ssl.key === 'string' && typeof this.config.ssl.certificate === 'string') ? true : false;
	}

	initHttpServer() {
		this.http_server = restify.createServer(this.serverOptions);
		this.initServer(this.http_server);
	}

	initHttpsServer() {
		if (this.isHttpsEnabled()) {
			var https_options = Object.assign(this.serverOptions, {
				key: fse.readFileSync(this.config.ssl.key),
				certificate: fse.readFileSync(this.config.ssl.certificate)
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
	}

	createSubscriptions(topics) {
		for(let i in topics) {
			this.api.subscriptions.registerTopic(topics[i]);
		}
	}

	populateGlobals(req, res, next) {
		req.config = this.config;
		req.processRegistry = this.processRegistry;
		req.user = this.api.users.emptyUser();
		req.api = this.api;
		req.downloadRegion = null;
		return next();
	}

	startServer() {
		this.initHttpServer();
		this.initHttpsServer();

		let p = [];
		for(var i in this.api) {
			p.push(this.api[i].beforeServerStart(this));
		}
		Promise.all(p)
		.then(() => this.startServerHttp())
		.then(() => this.startServerHttps())
		.catch(e => {
			console.log('Server not started due to the following error: ');
			console.log(e);
			process.exit(1);
		});

	}

	startServerHttp() {
		return new Promise((resolve, reject) => {
			const port = process.env.PORT || this.config.port;
			this.http_server.listen(port, () => {
				var portStr = port != 80 ? ":" + port : "";
				Utils.serverUrl = "http://" + this.config.hostname + portStr + this.config.apiPath;
				console.log('HTTP-Server listening at %s', Utils.getServerUrl());
				resolve();
			});
		});
	}

	startServerHttps() {
		return new Promise((resolve, reject) => {
			if (this.isHttpsEnabled()) {
				var sslport = process.env.SSL_PORT || this.config.ssl.port;
				this.https_server.listen(sslport, () => {
					var portStr = sslport != 443 ? ":" + sslport : "";
					Utils.serverUrl = "https://" + this.config.hostname + portStr + this.config.apiPath;
					console.log('HTTPS-Server listening at %s', Utils.getServerUrl());
					resolve();
				});
			}
			else {
				console.log('HTTPS not enabled.');
				resolve();
			}
		});
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