import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class anomaly extends GeeProcess {

	executeSync(node) {
		const dc = node.getDataCube('data');
		const normalsDataCube = node.getDataCube('normals');
		const normalsLabels = node.ee.List(normalsDataCube.dimT().getValues());
		const normalsCollection = normalsDataCube.imageCollection();
		const normals = normalsCollection.toList(normalsCollection.size());
		const period = node.getArgument('period');

		let images = Commons.setAggregationLabels(node, dc.imageCollection(), period);
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
