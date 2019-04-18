const Errors = require('../errors');
const Process = require('../processgraph/process');

module.exports = class rename_dimension extends Process {

	async execute(node, context) {
		var dc = node.getData("data");
		var name = node.getArgument('name');
		var value = node.getArgument('value');
		var type = node.getArgument("type");

		if (dc.hasDimension(name)) {
			throw new Errors.ProcessArgumentInvalid({
				process: this.schema.id,
				argument: 'new',
				reason: 'A dimension with the specified name already exists.'
			});
		}

		var dimension = dc.addDimension(name, type);
		dimension.addValue(value);
		// ToDo: Depending on the data in the datacube, we need to also apply changes at Googles side...

		return dc;
	}

};