import GeeProcess from '../processgraph/process.js';
import DataCube from '../processgraph/datacube.js';

export default class inspect extends GeeProcess {

	executeSync(node) {
		let data = node.getArgument('data');
		const message = node.getArgument('message', '');
		const code = node.getArgument('code', 'User');
		const level = node.getArgument('level', 'info');

		const ee = node.ee;
		if (data instanceof DataCube) {
			data = data.toJSON();
		}
		else if (data instanceof ee.ComputedObject) {
				node.warn('Inspecting GEE objects via getInfo() is slow. Do not use this in production.');
				data = data.getInfo();
		}

		const logger = node.getLogger();
		logger.add(message, level, data, node.getLoggerPath(), code)

		return data;
	}

}
