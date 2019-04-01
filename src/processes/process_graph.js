const axios = require('axios');
const Errors = require('../errors');
const Process = require('../processgraph/process');

module.exports = class process_graph extends Process {

	async validate(node, context) {
		var variables = node.getArgument("variables");
		context.setVariables(variables);

		node = await super.validate(node, context);
		
		var pg;
		var id = node.getArgument("id");
		var url = node.getArgument("url");
		if (typeof id === 'string') {
			pg = await this.loadInternal(id, context);
		}
		else if (typeof url === 'string') {
			pg = await this.loadExternal(url, context);
		}
		else {
			throw new Errors.ProcessArgumentsMissing({
				process: this.schema.id,
				min_parameters: 1
			});
		}

		node.setProvision("ProcessGraph", pg);
		return node;
	}

	async execute(node, context) {
		return context.executeProcessGraph(node.getProvision("ProcessGraph"), context);
	}

	loadInternal(id, context) {
		return context.getStoredProcessGraph(id).then(res => res.process_graph);
	}

	loadExternal(url, context) {
		return axios({
			method: 'get',
			url: url
		})
		.then(response => {
			// ToDo
			if (typeof response.data.process_graph === 'object') {
				return context.validateProcessGraph(response.data.process_graph, context).then(() => {
					return response.data.process_graph;
				});
			}
			else {
				throw new Errors.ProcessArgumentInvalid({
					argument: 'url',
					process: this.schema.id,
					reason: 'Could not load process graph from the specified URL.'
				});
			}
		})
		.catch(e => {
			throw Errors.wrap(e);
		});
	}
};