import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class filter_bands extends GeeProcess {

	executeSync(node) {
		const dc = node.getDataCube('data');
		const bands = node.getArgument('bands');
		return Commons.filterBands(dc, bands, node);
	}

}
