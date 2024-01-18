import { BaseProcess } from '@openeo/js-processgraphs';

export default class debug extends BaseProcess {

	async execute(node) {
		const data = node.getArgument('data');
		const code = node.getArgument('data');
		const level = node.getArgument('data', 'info');
		const message = node.getArgument('data');

		const logger = node.getLogger();
		logger[level](message, data, code);

		// ToDo 1.2: rename to inspect #81
		// ToDo processes: Implement that if GEE objects are passed into data, it requests gee.getInfo on them and logs the result. #81

		return data;
	}

}
