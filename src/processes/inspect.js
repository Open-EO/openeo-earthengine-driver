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
		else if (
			data instanceof ee.Image ||
			data instanceof ee.ImageCollection ||
			data instanceof ee.Array ||
			data instanceof ee.List ||
			data instanceof ee.Number ||
			data instanceof ee.String ||
			data instanceof ee.Feature ||
			data instanceof ee.FeatureCollection ||
			data instanceof ee.Geometry ||
			data instanceof ee.GeometryCollection ||
			data instanceof ee.ComputedObject) {
				node.warn('Inspecting GEE objects via getInfo() is slow. Do not use this in production.');
				data = data.getInfo();
		}

		const logger = node.getLogger();
		logger.add(message, level, data, node.getLoggerPath(), code)

		return data;
	}

}
