const Utils = require('../utils');
const Process = require('../processgraph/process');

module.exports = class ndvi extends Process {

	execute(args, context) {
		var obj = Utils.toImageCollection(args.imagery).map((image) => {
			var ndvi = image.normalizedDifference([args.nir, args.red]).rename('ndvi');
			// normalizedDifference removed the properties, which are required for zonal_statistics and other processes.
			// To maintain the properties add the ndvi to the image and then select the band to remove the other bands again.
			return image.addBands(ndvi).select('ndvi');
		});
		return Promise.resolve(obj);
	}

}