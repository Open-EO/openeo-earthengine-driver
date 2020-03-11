const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class anomaly extends BaseProcess {

	async execute(node) {
		var dc = node.getDataCube('data');
		var normalsCollection = node.getDataCube('normals').imageCollection();
		var normals = normalsCollection.toList(normalsCollection.size());
		var frequency = node.getArgument('frequency');

		var format;
		switch (frequency) {
			case 'hourly':
				format = "HH";
				break;
			case 'daily':
				format = "DDD";
				break;
			case 'weekly':
				format = "ww";
				break;
			case 'monthly':
				format = "MM";
				break;
			case 'yearly':
				format = "yyyy";
				break;
			case 'seasons':
				// ToDo
				break;
			case 'tropical_seasons':
				// ToDo
				break;
		}
		
		dc.imageCollection(imgCol => {
			return imgCol.map(image => {
				var index = ee.Number.parse(image.date().format(format));
				if (frequency === 'yearly') {
					index = 0;
				}
				else {
					index = index.subtract(1);
				}
				return image.subtract(normals.get(index)).copyProperties({source: image, properties: image.propertyNames()});
			});
		});

		return dc;
	}

};