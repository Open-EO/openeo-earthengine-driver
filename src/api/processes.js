module.exports = class Processes {

	constructor(context) {
		this.registry = context.processes();
	}

	async beforeServerStart(server) {
		server.addEndpoint('get', '/processes', this.getProcesses.bind(this));

		const num = await this.registry.addFromFolder('./src/processes/');
		console.log(`Loaded ${num} processes.`);
		return num;
	}

	async getProcesses(req, res) {
		res.json({
			processes: this.registry.namespace('backend'),
			links: []
		});
	}
	
};
