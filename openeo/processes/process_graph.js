const ProcessUtils = require('../processUtils');
const axios = require('axios');

module.exports = {
	process_id: "process_graph",
	summary: "Process data with a stored process graph.",
	description: "Loads a process graph that is stored on this or another back-end and processes data according to the process graph.",
	min_parameters: 1,
	parameters: {
		id: {
			description: "ID of the locally stored process graph.",
			schema: {
				type: "string"
			}
		},
		url: {
			description: "URL of the externally stored process graph.",
			schema: {
				type: "string",
				format: "url"
			}
		},
		variables: {
			description: "Process graph variables",
			schema: {
				type: "object"
			}
		}
	},
	returns: {
		description: "Processed EO data.",
		schema: {
			type: "object",
			format: "eodata"
		}
	},
	validate(req, args) {
		return ProcessUtils.validateSchema(this, args, req).then(args => {
			var promise;
			if (typeof args.id === 'string') {
				promise = this.loadInternal(req, args.id);
			}
			else if (typeof args.url === 'string') {
				promise = this.loadExternal(req, args.url);
			}

			if (promise) {
				return promise.then(pg => {
					args.processGraph = pg;
					return args;
				});
			}
			else {
				throw new Errors.ProcessArgumentsMissing({
					process: this.process_id,
					min_parameters: this.process.min_parameters
				});
			}
		});
	},
	execute(req, args) {
		return req.processRegistry.executeProcessGraph(req, args.processGraph, args.variables);
	},
	loadInternal(req, id) {
		return req.api.processGraphs.getById(id, req.user._id).then(res => {
			return res.process_graph;
		});
	},
	loadExternal(req, url) {
		return axios({
			method: 'get',
			url: url
		})
		.then(response => {
			if (typeof response.data.process_graph === 'object') {
				return req.processRegistry.validateProcessGraph(req, response.data.process_graph).then(() => {
					return response.data.process_graph;
				});
			}
			else {
				throw new Errors.ProcessArgumentInvalid({
					argument: 'url',
					process: this.process_id,
					reason: 'Could not load process graph from the specified URL.'
				});
			}
		})
		.catch(e => {
			throw Errors.wrap(e);
		});
	}
};