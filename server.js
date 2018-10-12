const Capabilities = require('./openeo/capabilities');
const Subscriptions = require('./openeo/subscription');
const Users = require('./openeo/users');
const Utils = require('./openeo/utils');
const fs = require('fs');
const restify = require('restify');

var geeServer = {

	endpoints: {
		capabilities: Capabilities,
		data: require('./openeo/data'),
		processes: require('./openeo/processes'),
		files: require('./openeo/files'),
		jobs: require('./openeo/jobs'),
		services: require('./openeo/services'),
		subscription: Subscriptions,
		users: Users,
		processGraphs: require('./openeo/processGraphs')
	},

	http_server: null,
	https_server: null,
	config: require('./storage/config.json'),

	init() {
		console.log('Initializing openEO Google Earth Engine driver...');
		const { eeAuthenticator } = require('./openeo/gee.js');
		eeAuthenticator.authenticate(this.config.auth, () => {
			console.log("GEE Authentication succeeded.");
			this.startServer();
		}, (error) => {
			console.log("GEE Authentication failed: " + error);
			process.exit(1);
		});
	},

	initEndpoints() {
		var initFuncs = [];
		for(var i in this.endpoints) {
			initFuncs.push(this.endpoints[i].init())
		}
		return Promise.all(initFuncs);
	},

	addEndpoint(method, path, callback) {
		if (!Array.isArray(path)) {
			path = [path, path.replace(/\{([\w]+)\}/g, ":$1")];
		}
		Capabilities.addEndpoint(method, path[0]);
		if (method === 'delete') {
			method = 'del';
		}
		this.http_server[method](path[1], callback);
		if (this.isHttpsEnabled()) {
			this.https_server[method](path[1], callback);
		}
	},

	isHttpsEnabled() {
		return (this.config.ssl && this.config.ssl.port > 0 && typeof this.config.ssl.key === 'string' && typeof this.config.ssl.certificate === 'string') ? true : false;
	},

	initServer(server) {
		server.pre(this.preflight);
		server.use(restify.plugins.queryParser());
		server.use(restify.plugins.bodyParser());
		server.use(restify.plugins.authorizationParser());
		server.use(this.corsHeader);
		server.use(Users.checkAuthToken.bind(Users));
	},

	createSubscriptions(topics) {
		for(let i in topics) {
			Subscriptions.registerTopic(topics[i]);
		}
		return Subscriptions;
	},

	startServer() {
		// handleUpgrades needed for protocol upgrade from HTTP to WebSockets: http://restify.com/docs/home/#upgrade-requests
		this.http_server = restify.createServer({handleUpgrades: true});
		this.initServer(this.http_server);

		if (this.isHttpsEnabled()) {
			var https_options = {
				key: fs.readFileSync(this.config.ssl.key),
				certificate: fs.readFileSync(this.config.ssl.certificate)
			};
			this.https_server = restify.createServer(https_options);
			this.initServer(this.https_server);
		}

		this.initEndpoints().then(() => {
			// Add routes
			for(var i in this.endpoints) {
				this.endpoints[i].routes(this);
			}

			// Start HTTP server on port ...
			const port = process.env.PORT || this.config.port;
			this.http_server.listen(port, () => {
				Utils.serverUrl = this.http_server.url.replace('[::]', this.config.hostname);
				console.log('%s listening at %s (HTTP)', this.http_server.name, Utils.serverUrl);
				this.startServerSSL();
			});
		}).catch((error) => {
			console.log(error);
			process.exit(2);
		});
	},

	startServerSSL() {
		// Start HTTPS server on port ...
		if (this.isHttpsEnabled()) {
			const sslport = process.env.SSL_PORT || this.config.ssl.port;
			this.https_server.listen(sslport, () => {
				console.log('%s listening at %s (HTTPS)', this.https_server.name, Utils.serverUrl)
			});
		}
		else {
			console.log('HTTPS not enabled.');
		}
	},

	corsHeader(req, res, next) {
		if (!req.headers['origin']) {
			return next();
		}

		res.setHeader('access-control-allow-origin', req.headers['origin']);
		res.setHeader('access-control-allow-credentials', 'true');
		return next();
	},

	preflight(req, res, next) {
		if (req.method !== 'OPTIONS') {
			return next();
		}

		res.once('header', () => {
			res.header('access-control-allow-origin', req.headers['origin'])
			res.header('access-control-allow-credentials', 'true')
			res.header('access-control-allow-methods', 'OPTIONS, GET, POST, PATCH, PUT, DELETE');
			res.header('access-control-allow-headers', 'Authorization, Content-Type');
		});

		res.send(204);
	}

};

geeServer.init();