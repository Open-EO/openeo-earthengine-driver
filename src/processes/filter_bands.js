import GeeProcess from '../processgraph/process.js';
import Commons from '../processgraph/commons.js';

export default class filter_bands extends GeeProcess {

	process(data, bands, node) {
		return Commons.filterBands(data, bands, node);
	}

	executeSync(node) {
		const dc = node.getDataCube('data');
		const bands = node.getArgument('bands');
		return this.process(dc, bands, node);
	}

}
