const Process = require('../processgraph/process');

module.exports = class save_result extends Process {

	async validate(node, context, processGraph) {
		await super.validate(node, context, processGraph);

		var format = node.getArgument("format");
		if (!context.server().isValidOutputFormat(format)) {
			throw new Errors.FormatUnsupported();
		}
		var options = node.getArgument("options");
		// ToDo: We don't support any options yet, validate them
	}

	async execute(node, context, processGraph) {
		var data = node.getData("data");
		data.setOutputFormat(
			node.getArgument("format"),
			node.getArgument("options")
		);
		return data;
	}

};