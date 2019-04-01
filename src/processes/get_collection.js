const Errors = require('../errors');
const Process = require('../processgraph/process');
const DataCube = require('../processgraph/datacube');

module.exports = class get_collection extends Process {

	async validate(node, context) {
		node = await super.validate(node, context);
		var name = node.getArgument('name');
		if (typeof name !== 'string') {
			throw new Errors.ProcessArgumentInvalid({
				process: this.schema.id,
				argument: 'name',
				reason: 'No collection name specified.'
			});
		}
		if (context.getCollection(name) === null) {
			throw new Errors.ProcessArgumentInvalid({
				process: this.schema.id,
				argument: 'name',
				reason: 'Collection does not exist.'
			});
		}
		return node;
	}

	async execute(node, context) {
		var name = node.getArgument('name');
		var collection = context.getCollection(name);
		var data = new DataCube();
		data.setData(ee.ImageCollection(name));
		data.setDimensionsFromSTAC(collection.properties['cube:dimensions']);
		return data;
	}

};