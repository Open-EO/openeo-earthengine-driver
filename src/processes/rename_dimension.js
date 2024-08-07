import Errors from '../utils/errors.js';
import GeeProcess from '../processgraph/process.js';

export default class rename_dimension extends GeeProcess {
	executeSync(node) {
		const dc = node.getDataCube("data");
		const srcName = node.getArgument('source');
		const trgName = node.getArgument('target');
		if (dc.hasDimension(srcName)) {
			throw new Errors.DimensionNotAvailable({
				process: this.id,
				parameter: 'source'
			});
		}
		else if (dc.hasDimension(trgName)) {
			throw new Errors.DimensionExists({
				process: this.id,
				parameter: 'target'
			});
		}

		return dc.renameDimension(srcName, trgName);
	}

}
