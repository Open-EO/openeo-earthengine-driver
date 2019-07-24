const Process = require('../processgraph/process');

module.exports = class normalized_difference_fast extends Process {

	process(dc, b1, b2, name){
		dc.imageCollection(ic => {
			return ic.map(image => {
				return image.normalizedDifference([b1, b2]).rename(name).select(name);
			});
		});
		dc.setBands([name]);
		return dc;
	}

	async execute(node, context) {
		var data = node.getData("data");
		var band1 = node.getArgument("band1");
		var band2 = node.getArgument("band2");
		var name = node.getArgument("name", "normalized_difference");
		return this.process(data, band1, band2, name);
	}

};