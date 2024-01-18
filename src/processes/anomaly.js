import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class anomaly extends BaseProcess {

	async execute(node) {
		var dc = node.getDataCube('data');
		var normalsDataCube = node.getDataCube('normals');
		var normalsLabels = ee.List(normalsDataCube.dimT().getValues());
		var normalsCollection = normalsDataCube.imageCollection();
		var normals = normalsCollection.toList(normalsCollection.size());
		var frequency = node.getArgument('frequency');

		var images = Commons.setAggregationLabels(dc.imageCollection(), frequency);
		images = images.map(image => {
			var label = image.get('label');
			var normal = normals.get(normalsLabels.indexOf(label));
			return image.subtract(normal).copyProperties({source: image, properties: image.propertyNames()});
		});

		dc.setData(images);
		// dc.setValues();

		return dc;
	}

}
