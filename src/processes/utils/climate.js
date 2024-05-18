const GeeClimateUtils = {

	setAggregationLabels(node, images, frequency) {
		const ee = node.ee;
		let aggregationFormat = null;
		let temporalFormat = null;
		let seasons = {};
		switch (frequency) {
			case 'hour':
				aggregationFormat = "yyyy-MM-DD-HH";
				temporalFormat = "HH";
				break;
			case 'day':
				aggregationFormat = "yyyy-DDD";
				temporalFormat = "DDD";
				break;
			case 'week':
				aggregationFormat = "yyyy-ww";
				temporalFormat = "ww";
				break;
			case 'month':
				aggregationFormat = "yyyy-MM";
				temporalFormat = "MM";
				break;
			case 'year':
				aggregationFormat = "yyyy";
				temporalFormat = "yyyy";
				break;
			case 'season':
				seasons = GeeClimateUtils.seasons(node);
				break;
			case 'tropical-season':
				seasons = GeeClimateUtils.tropicalSeasons(node);
				break;
		}

		// prepare image collection with aggregation labels
		images = images.sort('system:time_start');
		switch (frequency) {
			case 'hour':
			case 'day':
			case 'week':
			case 'month':
			case 'year':
				return images.map(img => {
					const date = img.date();
					return img.set('aggregationLabel', date.format(aggregationFormat)).set("label", date.format(temporalFormat));
				});
			case 'season':
			case 'tropical-season': {
				// This is are lists with relative months, e.g. 0 is december of the prev. year, -1 is november etc.
				seasons = ee.Dictionary(seasons);
				// Convert the relative months like -1 to their absolute values like 11.
				const realSeasons = seasons.map((label, months) => {
					return ee.List(months).map(m => {
						const num = ee.Number(m);
						return ee.Algorithms.If(num.lt(1), num.add(12), num);
					});
				});

				// Prepare image collection to contain aggregation label
				return images.map(img => {
					const date = img.date();
					const month = date.get('month');
					// Compute the corresponding season for the date
					const remainingSeason = seasons.map((label, months) => {
						const monthsInSeason = ee.List(realSeasons.get(label));
						return ee.Algorithms.If(monthsInSeason.contains(month), months, null); // null removes the element from the list
					});
					// Get the season - there should only be one entry left
					const season = remainingSeason.keys().get(0);
					const months = ee.List(remainingSeason.values().get(0));
					// Construct the "season label"
					let year = date.get('year');
					year = ee.Algorithms.If(months.contains(month), year, ee.Number(year).add(1));
					const index = ee.String(year).cat('-').cat(season); // e.g. 1979-son
					return img.set('aggregationLabel', index).set("label", season);
				});
			}
		}
	},

	tropicalSeasons(node) {
		const ee = node.ee;
		return {
			ndjfma: ee.List([-1, 0, 1, 2, 3, 4]),
			mjjaso: ee.List([5, 6, 7, 8, 9, 10])
		};
	},

	seasons(node) {
		const ee = node.ee;
		return {
			djf: ee.List([0, 1, 2]),
			mam: ee.List([3, 4, 5]),
			jja: ee.List([6, 7, 8]),
			son: ee.List([9, 10, 11])
		};
	},

};

export default GeeClimateUtils;
