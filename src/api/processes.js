module.exports = class Processes {

	constructor(context) {
		this.registry = context.processes();
	}

	beforeServerStart(server) {
		server.addEndpoint('get', '/processes', this.getProcesses.bind(this));

		return this.registry.addFromFolder('./src/processes/');
	}

	getProcesses(req, res, next) {
		res.json({
			processes: this.registry.toJSON(),
			links: []
		});
		return next();
	}
	
};
