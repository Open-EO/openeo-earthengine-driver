const Process = require('../processgraph/process');

module.exports = class normalized_difference extends Process {

	async execute(node, context) {
		var dc1 = node.getData("band1");
		var dc2 = node.getData("band2");
		var name = node.getArgument("name", "normalized_difference");
		dc1.imageCollection(ic => {
			var combined = ic.combine(dc2.imageCollection());
			return combined.map(image => {
				var normalizedDifference = image.normalizedDifference().rename(name);
				return image.addBands(normalizedDifference).select(name);
			});
		});
		dc1.setBands([name]);
		return dc1;
	}

}