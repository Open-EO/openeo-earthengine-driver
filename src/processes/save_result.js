const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class save_result extends BaseProcess {

	async validate(node) {
		await super.validate(node);

		var format = node.getArgument("format");
		if (!node.getServerContext().isValidOutputFormat(format)) {
			throw new Errors.FormatUnsupported();
		}
		var options = node.getArgument("options");
		// ToDo: We don't support any options yet, validate them
	}

	async execute(node) {
		var data = node.getData("data");
		data.setOutputFormat(
			node.getArgument("format"),
			node.getArgument("options")
		);
		return data;
	}

};