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
		var end = ee.Date(climatologyPeriod[1] + "-12-31");

		var labels, range, geeFrequencyName, seasons, geeSeasons;
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
				// Define seasons + labels
				seasons = Utils.seasons();
				geeSeasons = ee.Dictionary(seasons);
				labels = Object.keys(seasons);
				range = geeSeasons.values();
				geeFrequencyName = "month";
				// Adopt start and end time of climatology period depending on data availability
				var earlyStart = start.advance(-1, 'month');
				start = ee.Algorithms.If( // ToDo: Document in process definition
					dc.imageCollection().filter(ee.Filter.date(earlyStart, start)).size(),
					earlyStart,
					start.advance(2, 'month')
				);
				end = end.advance(-2, 'month');
				break;
			case 'tropical_seasons':
				// Define seasons + labels
				seasons = Utils.tropicalSeasons();
				geeSeasons = ee.Dictionary(seasons);
				labels = Object.keys(seasons);
				range = geeSeasons.values();
				geeFrequencyName = "month";
				// Adopt start and end time of climatology period depending on data availability
				var earlyStart = start.advance(-2, 'month');
				start = ee.Algorithms.If(
					dc.imageCollection().filter(ee.Filter.date(earlyStart, start)).size(),
					earlyStart,
					start.advance(4, 'month')
				);
				end = end.advance(-4, 'month');
				break;
			case 'climatology_period':
			case 'yearly': // alias for climatology_period
				range = [ee.List(climatologyPeriod)];
				geeFrequencyName = "year";
				labels = ["climatology_period"];
				break;
		}

		var filteredData = Commons.filterTemporal(dc, [start, end.advance(1, "day")], 'anomaly', 'climatology_period').imageCollection();

		var normals = ee.List(range).map(x => {
			var calFilter = null;
			switch(frequency) {
				case 'climatology_period':
				case 'yearly': // alias for climatology_period
				case 'seasons':
				case 'tropical_seasons':
					x = ee.List(x);
					calFilter = ee.Filter.calendarRange(x.get(0), x.get(-1), geeFrequencyName);
				case 'seasons':
				case 'tropical_seasons':
					calFilter = ee.Filter(ee.Algorithms.If(
						ee.Number(x.reduce('min')).lt(1),
						ee.Filter.or(ee.Filter.calendarRange(ee.Number(x.get(0)).add(12), 12, 'month'), ee.Filter.calendarRange(1, x.get(-1), 'month')),
						calFilter
					));
					break;
				default: // daily, monthly
					calFilter = ee.Filter.calendarRange(x, x, geeFrequencyName);
			}
			var periodData = filteredData.filter(calFilter);
			var firstImg = periodData.first();
			return periodData.mean().copyProperties({source: firstImg, properties: firstImg.propertyNames()});
		});
		
		dc.setData(ee.ImageCollection(normals));
		dc.dimT().setValues(labels);

		return dc;
	}

};