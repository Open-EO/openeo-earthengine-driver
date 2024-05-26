import GeeProcess from '../processgraph/process.js';
import DataCube from '../datacube/datacube.js';
import GeeProcessing from './utils/processing.js';

export default class inspect extends GeeProcess {

	// This process is special as it defines a sync and async version of the code
	// to reduce the impact of getInfo() calls on the performance.

	async execute(node) {
		const ee = node.ee;
		const data = node.getArgument('data');
		let message = node.getArgument('message', '');
		const code = node.getArgument('code', 'User');
		const level = node.getArgument('level', 'info');

		let evaluatedData;
		if (data instanceof DataCube) {
			evaluatedData = data.toJSON();
		}
		else if (data instanceof ee.ComputedObject) {
			evaluatedData = await GeeProcessing.evaluate(data);
		}
		else {
			evaluatedData = data;
		}

		if (message instanceof ee.ComputedObject) {
			message = String(await GeeProcessing.evaluate(ee.String(message)));
		}

		const logger = node.getLogger();
		logger.add(message, level, evaluatedData, node.getLoggerPath(), code)

		return data;
	}

	executeSync(node) {
		const ee = node.ee;
		const data = node.getArgument('data');
		let message = node.getArgument('message', '');
		const code = node.getArgument('code', 'User');
		const level = node.getArgument('level', 'info');

		let evaluatedData;
		if (data instanceof DataCube) {
			evaluatedData = data.toJSON();
		}
		else if (data instanceof ee.ComputedObject) {
			node.warn('Inspecting GEE objects (for `data`) via getInfo() is slow. Do not use this in production.');
			evaluatedData = data.getInfo();
		}
		else {
			evaluatedData = data;
		}

		if (message instanceof ee.ComputedObject) {
			node.warn('Inspecting GEE objects (for `message`) via getInfo() is slow. Do not use this in production.');
			message = String(ee.String(message).getInfo());
		}

		const logger = node.getLogger();
		logger.add(message, level, evaluatedData, node.getLoggerPath(), code)

		return data;
	}

}
