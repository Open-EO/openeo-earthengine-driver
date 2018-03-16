const { eeAuthenticator } = require('./openeo/gee.js');
const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware');
const fileCache = require('node-file-cache');
const { initData } = require('./openeo/data');

const cors = corsMiddleware({
	origins: ['*']
});

const cache = fileCache.create({
	file: './storage/cache.json'
});

const port = process.env.PORT || 8080;

const server = restify.createServer();
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());
server.pre(cors.preflight);
server.use(cors.actual);
server.use((req, res, next) => {
	req.cache = cache;
	req.serverUrl = server.url;
	next();
});

const routes = require('./openeo/routes');

eeAuthenticator.withConsole(() => {
	console.log("Authentication succeeded.");
	initData(cache).then(() => {
		console.log("INFO: Data sets loaded. Server is starting...");
		routes(server).listen(port, () =>
			console.log('%s listening at %s', server.name, server.url)
		);
	}).catch((error) => {
		console.log(error);
		process.exit(2);
	});
}, (error) => {
	console.log("Authentication failed: " + error);
	process.exit(1);
});