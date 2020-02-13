const Errors = require('../errors');
const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class rename_dimension extends BaseProcess {

	async execute(node) {
		var dc = node.getData("data");
		var oldName = node.getArgument('old');
		var newName = node.getArgument('new');

		if (dc.hasDimension(oldName)) {
			throw new Errors.ProcessArgumentInvalid({
				process: this.schema.id,
				argument: 'old',
				reason: 'A dimension with the specified name does not exist.'
			});
		}

		if (dc.hasDimension(newName)) {
			throw new Errors.ProcessArgumentInvalid({
				process: this.schema.id,
				argument: 'new',
				reason: 'A dimension with the specified name already exists.'
			});
		}

		dc.renameDimension(oldName, newName);
		return dc;
	}

};