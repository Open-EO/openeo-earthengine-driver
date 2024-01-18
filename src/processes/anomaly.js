import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class anomaly extends BaseProcess {

	async execute(node) {
		const dc = node.getDataCube('data');
		const normalsDataCube = node.getDataCube('normals');
		const normalsLabels = ee.List(normalsDataCube.dimT().getValues());
		const normalsCollection = normalsDataCube.imageCollection();
		const normals = normalsCollection.toList(normalsCollection.size());
		const frequency = node.getArgument('frequency');

		let images = Commons.setAggregationLabels(dc.imageCollection(), frequency);
		images = images.map(image => {
			const label = image.get('label');
			const normal = normals.get(normalsLabels.indexOf(label));
			return image.subtract(normal).copyProperties({ source: image, properties: image.propertyNames() });
		});

		dc.setData(images);
		// dc.setValues();

		return dc;
	}

}
