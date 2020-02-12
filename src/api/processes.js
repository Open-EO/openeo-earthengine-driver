const { MigrateProcesses } = require('@openeo/js-commons');

module.exports = class Processes {

	constructor(context) {
		this.registry = context.processes();
	}

	beforeServerStart(server) {
		server.addEndpoint('get', '/processes', this.getProcesses.bind(this));

		return this.registry.addFromFolder('./src/processes/');
	}

	getProcesses(req, res, next) {
		// ToDo 1.0: Remove temporary workaround to convert old processes to current spec
		res.json({
			processes: this.registry.getProcessSpecifications().map(p => MigrateProcesses.convertProcessToLatestSpec(p, "0.4.2")),
			links: []
		});
		return next();
	}
	
};
