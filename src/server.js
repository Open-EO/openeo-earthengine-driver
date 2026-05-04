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
import express from 'express';
import https from 'https';

class Server {

	constructor() {
		console.info('Initializing openEO Google Earth Engine driver...');

		this.http_server = null;
		this.https_server = null;

		this.corsExposeHeaders = 'Location, OpenEO-Identifier, OpenEO-Costs, Link, Range';

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

		// Express 5 requires named wildcards
		const routePath = (apiPath + path[1]).replace(/(?<![:\w])\*(?!\w)/g, '*wildcard');

		const wrappedCallback = (req, res, next) => {
			Promise.resolve(callback(req, res, next)).catch(next);
		};

		this.http_server[method](routePath, wrappedCallback);
		if (this.isHttpsEnabled()) {
			this.https_server[method](routePath, wrappedCallback);
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
		this.http_server = express();
		this.initServer(this.http_server);
	}

	initHttpsServer() {
		if (this.isHttpsEnabled()) {
			this.https_server = express();
			this.initServer(this.https_server);
		}
	}

	initServer(app) {
		app.use(this.preflight.bind(this));
		app.use(this.populateGlobals.bind(this));
		app.use(express.json());
		app.use(express.urlencoded({ extended: true }));
		app.use(this.authorizationParser.bind(this));
		app.use(this.injectCorsHeader.bind(this));
		app.use(this.api.users.checkRequestAuthToken.bind(this.api.users));
		if (this.serverContext.debug) {
			app.use(this.logRequest.bind(this));
		}
	}

	addErrorHandler(app) {
		app.use(this.errorHandler.bind(this));
	}

	errorHandler(err, req, res, next) {
		if (global.server.serverContext.debug) {
			if (err.originalError) {
				console.error(err.originalError);
			}
			else {
				console.error(err);
			}
		}
		const statusCode = err.statusCode || 500;
		if (typeof err.toJSON === 'function') {
			res.status(statusCode).json(err.toJSON());
		}
		else {
			res.status(statusCode).json({
				id: Date.now().toString(),
				code: 'Internal',
				message: err.message || 'Internal Server Error'
			});
		}
	}

	authorizationParser(req, res, next) {
		req.authorization = {};
		const auth = req.headers.authorization;
		if (!auth) {
			return next();
		}
		const parts = auth.split(' ');
		req.authorization.scheme = parts[0];
		req.authorization.credentials = parts.slice(1).join(' ');
		if (req.authorization.scheme === 'Basic') {
			const decoded = Buffer.from(req.authorization.credentials, 'base64').toString('utf-8');
			const idx = decoded.indexOf(':');
			req.authorization.basic = {
				username: idx >= 0 ? decoded.substring(0, idx) : decoded,
				password: idx >= 0 ? decoded.substring(idx + 1) : ''
			};
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
		.then(() => {
			this.addErrorHandler(this.http_server);
			if (this.isHttpsEnabled()) {
				this.addErrorHandler(this.https_server);
			}
		})
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
				const httpsServer = https.createServer({
					key: fse.readFileSync(this.serverContext.ssl.key),
					cert: fse.readFileSync(this.serverContext.ssl.certificate)
				}, this.https_server);
				httpsServer.listen(sslport, () => {
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
		console.log("Requested: " + req.method + " " + req.originalUrl);
		next();
	}

	injectCorsHeader(req, res, next) {
		if (!req.headers.origin) {
			return next();
		}

		res.set('access-control-allow-origin', '*');
		res.set('access-control-expose-headers', this.corsExposeHeaders);
		return next();
	}

	preflight(req, res, next) {
		if (req.method !== 'OPTIONS') {
			return next();
		}

		res.set('access-control-allow-origin', '*');
		res.set('access-control-expose-headers', this.corsExposeHeaders);
		res.set('access-control-allow-methods', 'OPTIONS, GET, POST, PATCH, PUT, DELETE');
		res.set('access-control-allow-headers', 'Authorization, Content-Type, Range');
		res.status(204).end();
		// Don't call next, this ends execution, nothing more to send.
	}

}

global.server = new Server();
