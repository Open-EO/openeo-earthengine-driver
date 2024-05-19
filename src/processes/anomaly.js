import GeeProcess from '../processgraph/process.js';
import GeeClimateUtils from './utils/climate.js';
import { copyProps } from './utils/processing.js';

export default class anomaly extends GeeProcess {

	executeSync(node) {
		const ee = node.ee;

		const dc = node.getDataCubeWithEE('data');
		const data = dc.getData();
		if (!(data instanceof ee.ImageCollection)) {
			throw node.invalidArgument('data', 'Must be a datacube with temporal dimension and/or more than one timestamp.');
		}

		const normalsDataCube = node.getDataCubeWithEE('normals');
		const normalsLabels = ee.List(normalsDataCube.dimT().getValues());
		const normalsData = normalsDataCube.getData();
		if (!(normalsData instanceof ee.ImageCollection)) {
			throw node.invalidArgument('normals', 'Must be a datacube with temporal dimension and/or more than one timestamp.');
		}

		// todo: this might be slow. Alternative?
		const normals = normalsData.toList(normalsData.size());

		const period = node.getArgument('period');

		const images = GeeClimateUtils.setAggregationLabels(node, data, period)
			.map(image => {
				const label = image.get('label');
				const normal = normals.get(normalsLabels.indexOf(label));
				return copyProps(ee, image.subtract(normal), image);
			});

		// dc.setValues();
		return dc.setData(images);
	}

}
