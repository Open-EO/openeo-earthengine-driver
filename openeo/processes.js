const ProcessRegistry = require('./processRegistry');

var Processes = {

	init() {
		return new Promise((resolve, reject) => resolve());
	},

	routes(server) {
		server.addEndpoint('get', '/processes', this.getProcesses.bind(this));
		server.addEndpoint('get', '/processes/{process_id}', this.getProcessById.bind(this));
	},

	getProcesses(req, res, next) {
		var data = Object.values(ProcessRegistry.processes).map(e => {
			delete e.args;
			delete e.eeCode;
			return e;
		});
		res.json(data);
		return next();
	},
	
	getProcessById(req, res, next) {
		var process = ProcessRegistry.get(req.params.process_id);
		if (process !== null) {
			delete process.eeCode;
			res.json(process);
		}
		else {
			res.send(404);
		}
		return next();
	}
	
};

module.exports = Processes;