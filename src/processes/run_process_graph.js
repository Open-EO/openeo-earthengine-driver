const axios = require('axios');
const Errors = require('../errors');
const Process = require('../processgraph/process');
const Utils = require('../utils');

module.exports = class run_process_graph extends Process {

	async validate(node, context, processGraph) {
		var variables = node.getArgument("variables");
		context.setVariables(variables);

		await super.validate(node, context, processGraph);
		
		var pg;
		var id = node.getArgument("id");
		if (id.includes('://')) { // Probably a URL (only a very rough check so far => ToDo)
			pg = await this.loadExternal(url, context);
		}
		else { // Probably an ID
			pg = await this.loadInternal(id, context);
		}
		var errors = await pg.validate();
		if (errors.count() > 0) {
			throw errors;
		}

		node.setProvision("ProcessGraph", pg);
	}

	async execute(node, context, processGraph) {
		var pg = node.getProvision("ProcessGraph");
		return await pg.execute();
	}

	async loadInternal(id, context) {
		var res = await context.getStoredProcessGraph(id);
		return new ProcessGraph(res.process_graph, context);
	}

	async loadExternal(url, context) {
		var response = await axios({
			method: 'get',
			url: url
		});
		// ToDo
		if (Utils.isObject(response.data.process_graph)) {
			return new ProcessGraph(response.data.process_graph, context);
		}
		else {
			throw new Errors.ProcessArgumentInvalid({
				argument: 'url',
				process: this.schema.id,
				reason: 'Could not load process graph from the specified URL.'
			});
		}
	}
};