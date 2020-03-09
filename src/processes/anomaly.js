const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class anomaly extends BaseProcess {

	async execute(node) {
		var dc = node.getDataCube('data');
		var frequency = node.getArgument('frequency');
		var climatologyPeriod = node.getArgument('climatology_period', ["1981-01-01","2011-01-01"]);

		// Get a data cube restricted to the climatological period (default: from 1981 to 2011)
		var climatologyPeriod = Commons.filterTemporal(dc, climatologyPeriod, 'anomaly', 'climatology_period').imageCollection();

		var dateFormat;
		switch (frequency) {
			case 'daily':
				dateFormat = "DDD";
				break;
			case 'monthly':
				dateFormat = "MM";
				break;
			case 'yearly':
				dateFormat = "yyyy";
				break;
			default:
				throw "Invalid frequency"; // Should never happen due to validation
		}

		// For each month (image) in the time-series, calculate the anomaly
		dc.imageCollection(imgCol => {
			return imgCol.map(image => {
				var datePart = ee.Number.parse(image.date().format(dateFormat));
				var calendarFilter = ee.Filter.calendarRange(datePart, datePart, frequency.replace('ly', ''));
				var climatology = climatologyPeriod.filter(calendarFilter).mean();
				return image.subtract(climatology).copyProperties({source: image, properties: image.propertyNames()});
			});
		});

		return dc;
	}

};