import Errors from '../utils/errors.js';
import { BaseProcess } from '@openeo/js-processgraphs';

export default class rename_dimension extends BaseProcess {
	async execute(node) {
		var dc = node.getDataCube("data");
		var srcName = node.getArgument('source');
		var trgName = node.getArgument('target');

		if (dc.hasDimension(srcName)) {
			throw new Errors.DimensionNotAvailable({
				process: this.id,
				argument: 'source'
			});
		}
		else  if (dc.hasDimension(trgName)) {
			throw new Errors.DimensionExists({
				process: this.id,
				argument: 'target'
			});
		}

		dc.renameDimension(srcName, trgName);
		return dc;
	}

}
