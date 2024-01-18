import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class filter_bands extends BaseProcess {

	process(data, bands, node){
		return Commons.filterBands(data, bands, node);
	}

	async execute(node) {
		var dc = node.getDataCube('data');
		var bands = node.getArgument('bands');
		return this.process(dc, bands, node);
	}

}
