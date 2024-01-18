import { BaseProcess } from '@openeo/js-processgraphs';
import Errors from '../utils/errors.js';

export default class save_result extends BaseProcess {

	async validate(node) {
		await super.validate(node);

		const format = node.getArgument("format");
		if (!node.getServerContext().isValidOutputFormat(format)) {
			throw new Errors.FormatUnsupported();
		}
		// var options = node.getArgument("options");
		// ToDo processes: Validate the options
	}

	async execute(node) {
		const data = node.getDataCube("data");
		data.setOutputFormat(
			node.getArgument("format"),
			node.getArgument("options")
		);
		return data;
	}

}
