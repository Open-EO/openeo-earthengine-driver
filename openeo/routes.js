module.exports = function (server) {
	const capabilities = require('./capabilities');
	const data = require('./data');
	const processes = require('./processes');
	const jobs = require('./jobs');
	const users = require('./users');

	server.get('/capabilities', capabilities.getCapabilities);
	server.get('/capabilities/services', capabilities.getServices);
	server.get('/capabilities/output_formats', capabilities.getOutputFormats);

	server.get('/data', data.getData);
	server.get('/data/:product_id', data.getDataById);

	server.get('/processes', processes.getProcesses);
	server.get('/processes/:process_id', processes.getProcessById);
	
	server.post('/execute', jobs.postExecute);

	server.get('/users/:user_id/credits', users.getUserCredits);

	return server;
};
