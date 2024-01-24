import Errors from '../utils/errors.js';
import GeeProcess from '../processgraph/process.js';

export default class add_dimension extends GeeProcess {

	executeSync(node) {
		const dc = node.getDataCube('data');
		const name = node.getArgument('name');
		const label = node.getArgument('label');
		const type = node.getArgument('type');

		if (dc.hasDimension(name)) {
			throw new Errors.DimensionExists({
				process: this.id,
				argument: 'name'
			});
		}

		// We can't add x and y spatial dimensions.
		const axis = (type === 'spatial') ? 'z' : null;
		const dimension = dc.addDimension(name, type, axis);
		dimension.addValue(label);

		return dc;
	}

}
