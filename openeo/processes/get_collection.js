const ProcessUtils = require('../processUtils');
const Errors = require('../errors');

module.exports = {
	process_id: "get_collection",
	summary: "Selects a collection.",
	description: "Filters and selects a single collection provided by the back-end. The back-end provider decides which of the potential collections is the most relevant one to be selected.",
	parameters: {
		name: {
			description: "Filter by collection name",
			required: true,
			schema: {
				type: "string",
				examples: [
					"COPERNICUS/S2"
				]
			}
		}
	},
	returns: {
		description: "EO data",
		schema: {
			type: "object",
			format: "eodata"
		}
	},
	validate(req, args) {
		return ProcessUtils.validateSchema(this, args, req).then(args => {
			if (!ProcessUtils.isVariable(args.name) && req.api.collections.getData(args.name) === null) {
				throw new Errors.ProcessArgumentInvalid({
					process: this.process_id,
					argument: 'name',
					reason: 'Collection does not exist.'
				});
			}
			return args;
		});
	},
	execute(req, args) {
		return Promise.resolve(ee.ImageCollection(args.name));
	}
};