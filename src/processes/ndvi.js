const Utils = require('../utils');
const Process = require('../processgraph/process');

module.exports = class ndvi extends Process {

	async execute(node, context) {
		var dc = node.getData("imagery");
		var nir = node.getArgument("nir");
		var red = node.getArgument("red");
		dc.imageCollection(imageCollection => {
			return imageCollection.map(image => {
				var ndvi = image.normalizedDifference([nir, red]).rename('ndvi');
				// normalizedDifference removed the properties, which are required for zonal_statistics and other processes.
				// To maintain the properties add the ndvi to the image and then select the band to remove the other bands again.
				return image.addBands(ndvi).select('ndvi');
			})
		});
		return dc;
	}

}