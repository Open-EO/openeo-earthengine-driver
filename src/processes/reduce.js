const Process = require('../processgraph/process');
const Errors = require('../errors');

// TODO: do we have to change this/reduce the dimension if we get multiple arguments back, e.g. from quantiles?
module.exports = class reduce extends Process {

	async execute(node, context) {
		var dc = node.getData("data");
		var dimension = node.getArgument("dimension");
		var temporalDimension = dc.getDimension(dimension);
		if (temporalDimension.type !== 'temporal') {
			throw new Errors.ProcessArgumentInvalid({
				process: this.schema.id,
				argument: 'dimension',
				reason: 'GEE can only reduce the temporal dimension at the moment.'
			});
		}
		var callback = node.getArgument("reducer");
		var resultNode = await callback.execute({
			data: dc
		});
		dc = resultNode.getResult();
		dc.dropDimension(dimension);
		return dc;
	}

};