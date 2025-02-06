import Errors from '../utils/errors.js';
import GeeProcess from '../processgraph/process.js';

export default class add_dimension extends GeeProcess {

	executeSync(node) {
		const ee = node.ee;
    const dc = node.getDataCubeWithEE('data');
		const name = node.getArgument('name');
		const label = node.getArgument('label');
		const type = node.getArgument('type', 'other');

		if (dc.hasDimension(name)) {
			throw new Errors.DimensionExists();
		}

		let data = dc.getData();
		if (type === 'temporal') {
			if (dc.hasT()) {
				throw new Errors.DimensionTypeExists();
			}
			if (data instanceof ee.Image) {
				data.set('system:time_start', label);
				data = ee.ImageCollection(data);
			}
			else if (data instanceof ee.Number || data instanceof ee.List) {
				data = ee.List([data]);
			}
			else if (data instanceof ee.Array) {
				data = ee.List([data.toList()]);
			}
		}
		else if (type === 'bands' || type === 'other') {
			if (type === 'bands' && dc.hasBands()) {
				throw new Errors.DimensionTypeExists();
			}
			const addBand = img => img.addBands(ee.Image().rename([label]));
			if (data instanceof ee.ImageCollection) {
				data = data.map(addBand);
			}
			if (data instanceof ee.Image) {
				data = addBand(data);
			}
			else if (data instanceof ee.Number || data instanceof ee.List) {
				data = ee.List([data]);
			}
			else if (data instanceof ee.Array) {
				data = ee.List([data.toList()]);
			}
		}

		const dimension = dc.addDimension(name, type);
		dimension.addValue(label);
		dc.setData(data);

		return dc;
	}

}
