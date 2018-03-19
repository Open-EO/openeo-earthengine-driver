const Capabilities = require('./openeo/capabilities');
const Users = require('./openeo/users');

var geeServer = {

	endpoints: {
		capabilities: Capabilities,
		data: require('./openeo/data'),
		processes: require('./openeo/processes'),
		jobs: require('./openeo/jobs'),
		users: Users,
	},

	server: null,
	serverPort: 8080,

	init() {
		console.log('Initializing openEO Google Earth Engine driver...');
		const { eeAuthenticator } = require('./openeo/gee.js');
		eeAuthenticator.withConsole(() => {
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
		Capabilities.addEndpoint(method, path);
		var serverPath = path.replace(/\{([\w]+)\}/g, ":$1");
		this.server[method](serverPath, callback);
	},

	startServer() {
		const corsMiddleware = require('restify-cors-middleware');
		const cors = corsMiddleware({
			origins: ['*'],
			allowHeaders: ['Authorization'],
			credentials: true
		});
		
		const restify = require('restify');
		this.server = restify.createServer();
		this.server.use(restify.plugins.queryParser());
		this.server.use(restify.plugins.bodyParser());
		this.server.use(restify.plugins.authorizationParser());
		this.server.pre(cors.preflight);
		this.server.use(cors.actual);
		this.server.use(Users.checkAuthToken.bind(Users));
		this.server.use((req, res, next) => {
			req.serverUrl = this.server.url;
			next();
		});

		this.initEndpoints().then(() => {
			// Add routes
			for(var i in this.endpoints) {
				this.endpoints[i].routes(this);
			}
			// Start server on port ...
			const port = process.env.PORT || this.serverPort;
			this.server.listen(port, () =>
				console.log('%s listening at %s', this.server.name, this.server.url)
			);
		}).catch((error) => {
			console.log(error);
			process.exit(2);
		});
	}

};

geeServer.init();