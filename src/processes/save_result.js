import GeeProcess from '../processgraph/process.js';
import Errors from '../utils/errors.js';

export default class save_result extends GeeProcess {

	async validate(node) {
		await super.validate(node);

		const config = node.getServerContext();

		const formatName = node.getArgument("format");
		const format = config.getOutputFormat(formatName);
		if (!format) {
			throw new Errors.FileTypeInvalid({
				type: formatName,
				types: Object.keys(config.outputFormats)
			});
		}

		const options = node.getArgument("options", {});
		format.validateParameters(options);
	}

	executeSync(node) {
		const data = node.getDataCube("data");
		data.setOutputFormat(
			node.getArgument("format"),
			node.getArgument("options", {})
		);
		return data;
	}

}
