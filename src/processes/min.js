const Process = require('../processgraph/process');

module.exports = class min extends Process {

	async execute(node, context, processGraph) {
		var dc = node.getData("data");
		if (processGraph.isSimpleReducer() || dc.isImageCollection()) {
			dc.imageCollection(ic => ic.reduce('min'));
		}
		else if (dc.isArray()) {
			dc.array(arr => arr.min());
		}
		else {
			throw "Calculating min not supported for given data type.";
		}
		return dc;
	}

};