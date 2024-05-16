import GeeProcess from '../processgraph/process.js';
import Errors from '../utils/errors.js';

export default class save_result extends GeeProcess {

	async validate(node) {
		await super.validate(node);

		const format = node.getArgument("format");
		if (!node.getServerContext().isValidOutputFormat(format)) {
			throw new Errors.FormatUnsupported();
		}
		// var options = node.getArgument("options");
		// ToDo processes: Validate the options
	}

	executeSync(node) {
		const data = node.getDataCube("data");
		data.setOutputFormat(
			node.getArgument("format"),
			node.getArgument("options")
		);
		return data;
	}

}
