const axios = require('axios');
const Errors = require('../errors');
const Process = require('../processgraph/process');

module.exports = class process_graph extends Process {

	validate(args, context) {
		context.setVariables(args.variables);
		return this.validateSchema(args).then(args => {
			var promise;
			if (typeof args.id === 'string') {
				promise = this.loadInternal(args.id, context);
			}
			else if (typeof args.url === 'string') {
				promise = this.loadExternal(args.url, context);
			}

			if (promise) {
				return promise.then(pg => {
					args.processGraph = pg;
					return args;
				});
			}
			else {
				throw new Errors.ProcessArgumentsMissing({
					process: this.schema.id,
					min_parameters: 1
				});
			}
		});
	}

	execute(args, context) {
		context.setVariables(args.variables);
		return context.executeProcessGraph(args.processGraph, context);
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