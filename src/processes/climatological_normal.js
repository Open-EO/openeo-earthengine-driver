import GeeProcess from '../processgraph/process.js';
import Utils from '../utils/utils.js';
import GeeClimateUtils from './utils/climate.js';
import If from './if.js';

export default class climatological_normal extends GeeProcess {

	executeSync(node) {
		const ee = node.ee;
		const dc = node.getDataCubeWithEE('data');
		const data = dc.getData();
		const period = node.getArgument('period');
		const climatologyPeriod = node.getArgumentAsListEE('climatology_period', null, [1981, 2010]);

		// Get a data cube restricted to the climatological period (default: from 1981 to 2010)
		let start = ee.Date.fromYMD(climatologyPeriod.get(0), 1, 1);
		let end = ee.Date.fromYMD(climatologyPeriod.get(1), 12, 31);

		let labels, range, geeFrequencyName, seasons, geeSeasons, earlyStart;
		switch (period) {
			case 'day':
				labels = range = Utils.sequence(1, 365);
				geeFrequencyName = "day_of_year";
				break;
			case 'month':
				labels = range = Utils.sequence(1, 12);
				geeFrequencyName = "month";
				break;
			case 'season':
				// Define seasons + labels
				seasons = GeeClimateUtils.seasons(node);
				geeSeasons = ee.Dictionary(seasons);
				labels = Object.keys(seasons);
				range = geeSeasons.values();
				geeFrequencyName = "month";
				// Adopt start and end time of climatology period depending on data availability
				earlyStart = start.advance(-1, 'month');
				start = If.process(
					data.filter(ee.Filter.date(earlyStart, start)).size(),
					earlyStart,
					start.advance(2, 'month')
				);
				end = end.advance(-2, 'month');
				break;
			case 'tropical-season':
				// Define seasons + labels
				seasons = GeeClimateUtils.tropicalSeasons(node);
				geeSeasons = ee.Dictionary(seasons);
				labels = Object.keys(seasons);
				range = geeSeasons.values();
				geeFrequencyName = "month";
				// Adopt start and end time of climatology period depending on data availability
				earlyStart = start.advance(-2, 'month');
				start = If.process(
					data.filter(ee.Filter.date(earlyStart, start)).size(),
					earlyStart,
					start.advance(4, 'month')
				);
				end = end.advance(-4, 'month');
				break;
			case 'climatology-period':
			case 'year': // alias for climatology-period
				range = climatologyPeriod;
				geeFrequencyName = "year";
				labels = ["climatology-period"];
				break;
		}

		const filteredData = data.filterDate(start, end.advance(1, "day"));

		const normals = ee.List(range).map(x => {
			let calFilter = null;
			switch (period) {
				case 'climatology-period':
				case 'year': // alias for climatology-period
				case 'season':
				case 'tropical-season':
					x = ee.List(x);
					calFilter = ee.Filter.calendarRange(x.get(0), x.get(-1), geeFrequencyName);
					break;
			}
			switch (period) {
				case 'season':
				case 'tropical-season':
					calFilter = ee.Filter(If.process(
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

		dc.dimT().setValues(labels);
		return dc.setData(ee.ImageCollection(normals));
	}

}
