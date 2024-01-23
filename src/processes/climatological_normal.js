import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';
import Utils from '../utils/utils.js';
import GeeUtils from '../processgraph/utils.js';

export default class climatological_normal extends GeeProcess {

	executeSync(node) {
		const ee = node.ee;
		const dc = node.getDataCube('data');
		const frequency = node.getArgument('frequency');

		// Get a data cube restricted to the climatological period (default: from 1981 to 2010)
		const climatologyPeriod = node.getArgument('climatology_period', ["1981", "2010"]).map(x => parseInt(x, 10));
		let start = ee.Date(climatologyPeriod[0] + "-01-01");
		let end = ee.Date(climatologyPeriod[1] + "-12-31");

		let labels, range, geeFrequencyName, seasons, geeSeasons, earlyStart;
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
				seasons = GeeUtils.seasons(node);
				geeSeasons = ee.Dictionary(seasons);
				labels = Object.keys(seasons);
				range = geeSeasons.values();
				geeFrequencyName = "month";
				// Adopt start and end time of climatology period depending on data availability
				earlyStart = start.advance(-1, 'month');
				start = ee.Algorithms.If( // ToDo processes: Document in process definition
					dc.imageCollection().filter(ee.Filter.date(earlyStart, start)).size(),
					earlyStart,
					start.advance(2, 'month')
				);
				end = end.advance(-2, 'month');
				break;
			case 'tropical_seasons':
				// Define seasons + labels
				seasons = GeeUtils.tropicalSeasons(node);
				geeSeasons = ee.Dictionary(seasons);
				labels = Object.keys(seasons);
				range = geeSeasons.values();
				geeFrequencyName = "month";
				// Adopt start and end time of climatology period depending on data availability
				earlyStart = start.advance(-2, 'month');
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

		const filteredData = Commons.filterTemporal(dc, [start, end.advance(1, "day")], 'anomaly', 'climatology_period').imageCollection();

		const normals = ee.List(range).map(x => {
			let calFilter = null;
			switch (frequency) {
				case 'climatology_period':
				case 'yearly': // alias for climatology_period
				case 'seasons':
				case 'tropical_seasons':
					x = ee.List(x);
					calFilter = ee.Filter.calendarRange(x.get(0), x.get(-1), geeFrequencyName);
					break;
			}
			switch (frequency) {
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
			const periodData = filteredData.filter(calFilter);
			const firstImg = periodData.first();
			return periodData.mean().copyProperties({ source: firstImg, properties: firstImg.propertyNames() });
		});

		dc.setData(ee.ImageCollection(normals));
		dc.dimT().setValues(labels);

		return dc;
	}

}
