const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');
const Utils = require('../utils');

module.exports = class climatological_normal extends BaseProcess {

	async execute(node) {
		var dc = node.getDataCube('data');
		var frequency = node.getArgument('frequency');

		// Get a data cube restricted to the climatological period (default: from 1981 to 2010)
		var climatologyPeriod = node.getArgument('climatology_period', ["1981","2010"]).map(x => parseInt(x, 10));
		var start = ee.Date(climatologyPeriod[0] + "-01-01");
		var end = ee.Date(climatologyPeriod[1] + "-12-31").advance(1, "day");
		var filteredData = Commons.filterTemporal(dc, [start, end], 'anomaly', 'climatology_period').imageCollection();

		var labels, range, geeFrequencyName;
		switch (frequency) {
			case 'daily':
				labels = range = Utils.sequence(1, 365);
				geeFrequencyName = "day_of_year";
				break;
			case 'monthly':
				labels = range = Utils.sequence(1, 12);
				geeFrequencyName = "month";
				break;
			case 'seasons':
				// ToDo
				break;
			case 'tropical_seasons':
				// ToDo
				break;
			case 'climatology_period':
				range = [ee.List(climatologyPeriod)];
				geeFrequencyName = "year";
				labels = ["climatology_period"];
				break;
		}

		var normals = ee.List(range).map(function(x) {
			var calFilter;
			if (frequency === 'climatology_period') {
				x = ee.List(x);
				calFilter = ee.Filter.calendarRange(x.get(0), x.get(1), geeFrequencyName);
			}
			else {
				calFilter = ee.Filter.calendarRange(x, x, geeFrequencyName);
			}
			return filteredData.filter(calFilter).mean();
		});
		
		dc.setData(ee.ImageCollection(normals));
		dc.dimT().setValues(labels);

		return dc;
	}

};