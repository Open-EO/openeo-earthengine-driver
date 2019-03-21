const Errors = require('../errors');
const Process = require('../processgraph/process');

module.exports = class get_collection extends Process {

	validate(args, context) {
		return this.validateSchema(args).then(args => {
			if (typeof args.name !== 'string') {
				throw new Errors.ProcessArgumentInvalid({
					process: this.schema.id,
					argument: 'name',
					reason: 'No collection name specified.'
				});
			}
			if (context.getCollection(args.name) === null) {
				throw new Errors.ProcessArgumentInvalid({
					process: this.schema.id,
					argument: 'name',
					reason: 'Collection does not exist.'
				});
			}
			return args;
		});
	}

	execute(args, context) {
		// ToDo: If image type is image: ee.Image()
		var data = ee.ImageCollection(args.name);
		context.importFromCollection(args.name);
		return Promise.resolve(data);
	}

};