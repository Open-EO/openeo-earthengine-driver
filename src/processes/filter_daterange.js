const Utils = require('../utils');
const Process = require('../processgraph/process');

module.exports = class filter_daterange extends Process {

	async execute(node, context) {
		var extent = node.getArgument("extent");
		if (extent[0] === null) {
			extent[0] = "0000-01-01"; // Open date range: We just set the extent to the minimal start date here.
		}
		if (extent[1] === null) {
			extent[1] = Date.now(); // Open date range: The end date is set to the current date
		}

		var dc = node.getData("imagery");
		dc.imageCollection(ic => ic.filterDate(
			extent[0] === null ? '0000-01-01' : extent[0],
			extent[1] === null ? '0000-01-01' : extent[1]
		));
		dc.dimT().setExtent(extent);
		return dc;
	}

};