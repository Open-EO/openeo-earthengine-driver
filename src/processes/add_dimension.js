import Errors from '../utils/errors.js';
import { BaseProcess } from '@openeo/js-processgraphs';

export default class add_dimension extends BaseProcess {

	async execute(node) {
		const dc = node.getDataCube("data");
		const name = node.getArgument('name');
		const label = node.getArgument('label');
		const type = node.getArgument("type");

		if (dc.hasDimension(name)) {
			throw new Errors.DimensionExists({
				process: this.id,
				argument: 'name'
			});
		}

		const dimension = dc.addDimension(name, type);
		dimension.addValue(label);

		// Todo processes: A Number value for label causes problems
		if (!Number.isInteger(label)) {
			dc.renameLabels(dimension, [label], ["#"]);
		}
		return dc;
	}

}
