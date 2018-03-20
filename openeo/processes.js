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
			return {
				process_id: e.process_id,
				description: e.description
			};
		});
		res.json(data);
		return next();
	},
	
	getProcessById(req, res, next) {
		var process = ProcessRegistry.get(req.params.process_id);
		if (process !== null) {
			res.json({
				process_id: process.process_id,
				description: process.description,
				args: process.args
			});
		}
		else {
			res.send(404);
		}
		return next();
	}
	
};

module.exports = Processes;