const Errors = require('../errors');
const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class add_dimension extends BaseProcess {

	async execute(node) {
		var dc = node.getData("data");
		var name = node.getArgument('name');
		var label = node.getArgument('label');
		var type = node.getArgument("type");

		if (dc.hasDimension(name)) {
			throw new Errors.DimensionExists({
				process: this.spec.id,
				argument: 'name'
			});
		}

		var dimension = dc.addDimension(name, type);
		dimension.addValue(label);
		// ToDo: Depending on the data in the datacube, we need to also apply changes at Googles side...

		return dc;
	}

};