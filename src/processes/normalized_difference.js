const { BaseProcess } = require('@openeo/js-processgraphs');

//ToDo: Reimplementing for verision 1.0.0 --> sub process graph
module.exports = class normalized_difference extends BaseProcess {

	process(dc1, dc2, name){
		dc1.imageCollection(ic => {
			// ToDo: Combine is incredibly slow, we should look for a better alternative...
			var combined = ic.combine(dc2.imageCollection());
			return combined.map(image => {
				var normalizedDifference = image.normalizedDifference().rename(name);
				return image.addBands(normalizedDifference).select(name);
			});
		});
		dc1.setBands([name]);
		return dc1;
	}

	async execute(node) {
		var dc1 = node.getData("band1");
		var dc2 = node.getData("band2");
		var name = node.getArgument("name", "normalized_difference");
		return this.process(dc1, dc2, name);
	}

};