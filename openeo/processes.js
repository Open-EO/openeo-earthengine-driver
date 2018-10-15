const ProcessRegistry = require('./processRegistry');

module.exports = class Processes {

	constructor() {}

	beforeServerStart(server) {
		server.addEndpoint('get', '/processes', this.getProcesses.bind(this));

		return new Promise((resolve, reject) => resolve());
	}

	getProcesses(req, res, next) {
		var processes = Object.values(ProcessRegistry.processes).map(p => {
			let process = {
				name: p.process_id,
				description: p.description,
				parameters: p.parameters,
				returns: p.returns
			};
			if (typeof p.summary !== 'undefined') {
				process.summary = p.summary;
			}
			if (typeof p.min_parameters !== 'undefined') {
				process.min_parameters = p.min_parameters;
			}
			if (typeof p.deprecated !== 'undefined') {
				process.deprecated = p.deprecated;
			}
			if (typeof p.exceptions !== 'undefined') {
				process.exceptions = p.exceptions;
			}
			if (typeof p.examples !== 'undefined') {
				process.examples = p.examples;
			}
			if (typeof p.links !== 'undefined') {
				process.links = p.links;
			}
			return process;
		});
		res.json({
			processes: processes,
			links: []
		});
		return next();
	}
	
};
