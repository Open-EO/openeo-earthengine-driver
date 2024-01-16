const { BaseProcess } = require('@openeo/js-processgraphs');
const Errors = require('../utils/errors');
const ProcessGraph = require('../processgraph/processgraph');

module.exports = class apply extends BaseProcess {

	async execute(node) {
		var dc = node.getDataCube("data");

		var callback = node.getArgument("process");
		if (!(callback instanceof ProcessGraph)) {
			throw new Errors.ProcessArgumentInvalid({
				process: this.id,
				argument: 'process',
				reason: 'No process specified.'
			});
		}

		var resultNode = await callback.execute({
			x: dc.getData(),
			context: node.getArgument("context")
		});
        dc.setData(resultNode.getResult());
		return dc;
	}

};