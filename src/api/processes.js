export default class Processes {

	constructor(context) {
		this.registry = context.processes();
	}

	async beforeServerStart(server) {
		server.addEndpoint('get', '/processes', this.getProcesses.bind(this));

		const a = Date.now();
		const num = await this.registry.addFromFolder('./src/processes/');
		console.log(`Loaded ${num} processes (${Date.now()-a} ms)`);
		return num;
	}

	async getProcesses(req, res) {
		res.json({
			processes: this.registry.namespace('backend'),
			links: []
		});
	}

}
