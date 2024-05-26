/*eslint n/no-process-exit: "off"*/
import CapabilitiesAPI from './api/capabilities.js';
import CollectionsAPI from './api/collections.js';
import FilesAPI from './api/files.js';
import JobsAPI from './api/jobs.js';
import ProcessesAPI from './api/processes.js';
import ProcessGraphsAPI from './api/storedprocessgraphs.js';
import ServicesAPI from './api/services.js';
import UsersAPI from './api/users.js';

import API from './utils/API.js';
import ServerContext from './utils/servercontext.js';

import fse from 'fs-extra';
import restify from 'restify';

class Server {

	constructor() {
		console.info('Initializing openEO Google Earth Engine driver...');

		this.http_server = null;
		this.https_server = null;

		this.serverOptions = {
			handleUpgrades: true,
			ignoreTrailingSlash: true
		};
		this.corsExposeHeaders = 'Location, OpenEO-Identifier, OpenEO-Costs, Link';

		this.serverContext = new ServerContext();

		this.api = {};
		this.api.capabilities = new CapabilitiesAPI(this.serverContext);
		this.api.collections = new CollectionsAPI(this.serverContext);
		this.api.processes = new ProcessesAPI(this.serverContext);
		this.api.files = new FilesAPI(this.serverContext);
		this.api.jobs = new JobsAPI(this.serverContext);
		this.api.services = new ServicesAPI(this.serverContext);
		this.api.users = new UsersAPI(this.serverContext);
		this.api.processGraphs = new ProcessGraphsAPI(this.serverContext);

		this.startServer();
	}

	addEndpoint(method, path, callback, expose = true, root = false) {
		if (!Array.isArray(path)) {
			path = [path, path.replace(/\{([\w]+)\}/g, ":$1")];
		}

		if (expose && !root) {
			this.api.capabilities.addEndpoint(method, path[0]);
		}
		const apiPath = root ? '' : this.serverContext.apiPath;

		if (method === 'delete') {
			method = 'del';
		}

		this.http_server[method](apiPath + path[1], callback);
		if (this.isHttpsEnabled()) {
			this.https_server[method](apiPath + path[1], callback);
		}
	}

	beforeServerStart() {
		const p = [];
		for(const i in this.api) {
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
			const https_options = Object.assign({}, this.serverOptions, {
				key: fse.readFileSync(this.serverContext.ssl.key),
				certificate: fse.readFileSync(this.serverContext.ssl.certificate)
			});
			this.https_server = restify.createServer(https_options);
			this.initServer(this.https_server);
		}
	}

	initServer(server) {
		server.on('restifyError', this.errorHandler.bind(this));
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

	errorHandler(req, res, e, next) {
		if (global.server.serverContext.debug) {
			if (e.originalError) {
				console.error(e.originalError);
			}
			else {
				console.error(e);
			}
		}
		return next();
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
		.catch(e => {
			console.error('Server not started due to the following error: ');
			console.error(e);
			process.exit(1);
		});

	}

	async startServerHttp() {
		return new Promise((resolve) => {
			const port = process.env.PORT || this.serverContext.port;
			this.http_server.listen(port, () => {
				const exposePortStr = this.serverContext.exposePort !== 80 ? ":" + this.serverContext.exposePort : "";
				API.origin = "http://" + this.serverContext.hostname + exposePortStr;
				API.path = this.serverContext.apiPath;
				console.info('HTTP-Server listening at %s', API.getUrl());
				resolve();
			});
		});
	}

	startServerHttps() {
		return new Promise((resolve) => {
			if (this.isHttpsEnabled()) {
				const sslport = process.env.SSL_PORT || this.serverContext.ssl.port;
				this.https_server.listen(sslport, () => {
					const exposePortStr = this.serverContext.ssl.exposePort !== 443 ? ":" + this.serverContext.ssl.exposePort : "";
					API.origin = "https://" + this.serverContext.hostname + exposePortStr;
					API.path = this.serverContext.apiPath;
					console.info('HTTPS-Server listening at %s', API.getUrl());
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

		res.setHeader('access-control-allow-origin', '*');
		res.setHeader('access-control-expose-headers', this.corsExposeHeaders);
		return next();
	}

	preflight(req, res, next) {
		if (req.method !== 'OPTIONS') {
			return next();
		}

		res.once('header', () => {
			res.header('access-control-allow-origin', '*');
			res.header('access-control-expose-headers', this.corsExposeHeaders);
			res.header('access-control-allow-methods', 'OPTIONS, GET, POST, PATCH, PUT, DELETE');
			res.header('access-control-allow-headers', 'Authorization, Content-Type, Range');
		});

		res.send(204);
		// Don't call next, this ends execution, nothing more to send.
	}

}

global.server = new Server();
