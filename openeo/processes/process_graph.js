const ProcessUtils = require('../processUtils');

module.exports = {
	process_id: "process_graph",
	summary: "Load a stored process graph.",
	description: "Loads a process graph that is stored on the back-end. No remote fetching implemented yet.",
	parameters: {
		id: {
			description: "ID of the locally stored process graph.",
			required: true,
			schema: {
				type: "string"
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
		description: "Process graph",
		schema: {
			type: "object"
		}
	},
	validate(req, args) {
		// ToDo: Further validation
		return ProcessUtils.validateSchema(this, args, req).then(args => {
			// Load Process graph
			throw new Errors.FeatureUnsupported();
			return args;
		});
	},
	execute(req, args) {

		return Promise.resolve(obj);
	}
};