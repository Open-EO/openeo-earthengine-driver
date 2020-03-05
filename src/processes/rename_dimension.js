const Errors = require('../errors');
const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class rename_dimension extends BaseProcess {
	async execute(node) {
		var dc = node.getDataCube("data");
		var srcName = node.getArgument('source');
		var trgName = node.getArgument('target');

		if (dc.hasDimension(srcName)) {
			throw new Errors.DimensionNotAvailable({
				process: this.spec.id,
				argument: 'source'
			});
		}
		else  if (dc.hasDimension(trgName)) {
			throw new Errors.DimensionExists({
				process: this.spec.id,
				argument: 'target'
			});
		}

		dc.renameDimension(srcName, trgName);
		return dc;
	}

};