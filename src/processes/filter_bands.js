import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class filter_bands extends BaseProcess {

	process(data, bands, node) {
		return Commons.filterBands(data, bands, node);
	}

	async execute(node) {
		const dc = node.getDataCube('data');
		const bands = node.getArgument('bands');
		return this.process(dc, bands, node);
	}

}
