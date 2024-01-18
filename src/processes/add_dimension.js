import Errors from '../utils/errors.js';
import { BaseProcess } from '@openeo/js-processgraphs';

export default class add_dimension extends BaseProcess {

	async execute(node) {
		var dc = node.getDataCube("data");
		var name = node.getArgument('name');
		var label = node.getArgument('label');
		var type = node.getArgument("type");

		if (dc.hasDimension(name)) {
			throw new Errors.DimensionExists({
				process: this.id,
				argument: 'name'
			});
		}

		var dimension = dc.addDimension(name, type);

		dimension.addValue(label);

		// Todo processes: A Number value for label causes problems
		if (!Number.isInteger(label)) {
			dc.renameLabels(dimension, [label], ["#"]);
		}
		return dc;
	}

}
