import GeeProcess from '../processgraph/process.js';

export default class aggregate_temporal extends GeeProcess {

	async validate(node) {
		await super.validate(node);

		const intervals = node.getArgument('intervals');
		let labels = node.getArgument('labels', []);

		if (labels.length > 0 && labels.length !== intervals.length) {
			throw node.invalidArgument('labels', 'The number of labels must be equal to the number of intervals.');
		}

		if (labels.length === 0) {
			labels = intervals.map(range => range[0]);
		}
		const uniqueLabels = [...new Set(labels)];
		if (labels.length !== uniqueLabels.length) {
			throw node.invalidArgument('labels', 'Labels must be unique.');
		}
	}

	executeSync(node) {
		// STEP 1: Get parameters
		const ee = node.ee;
		const dc = node.getDataCubeWithEE('data');
		const intervals = node.getArgument('intervals');
		let labels = node.getArgument('labels', []);
		const reducer = node.getCallback('reducer');
		const dimensionName = node.getArgument('dimension', null);
		const context = node.getArgument("context", null);

		// STEP 2: Validate parameters
		const data = node.getData();
		if (!(data instanceof ee.ImageCollection)) {
			throw node.invalidArgument('data', 'Data must have a temporal dimension and/or more than one timestamp.');
		}

		const dimension = dimensionName ? dc.dim(dimensionName) : dc.dimT();
		if (dimension.getType() !== 'temporal') {
			throw node.invalidArgument('dimension', 'The specified dimension must be a temporal dimension.');
		}

		// STEP 3: Prepare labels and intervals
		if (labels.length === 0) {
			labels = intervals.map(range => range[0]);
		}

		let ranges = ee.List([]);
		for (let interval of intervals) {
			ranges = ranges.add(ee.List([
				ee.Date(interval[0] || "0000-01-01"),
				ee.Date(interval[1] || "9999-12-31")
			]));
		}

		// STEP 4: Aggregate data
		const aggregatedImages = ee.Dictionary
			.fromLists(labels, ranges)
			.map((label, range) => {
				let dates = ee.List(range);
				let collection = data.filterDate(dates.get(0), dates.get(1));
				const image = ee.Image(reducer.execute({
					data: collection,
					context,
					executionContext: {
						type: "reducer",
						parameter: "dimension",
						dimension
					}
				}));
				return image
					.set('label', label)
					.set('system:time_start', label);
			});

		// STEP 5: Update data cube
		dimension.setValues(labels);
		return dc.setData(ee.ImageCollection(aggregatedImages));
	}

}
