import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class reduce_dimension extends BaseProcess {

	async execute(node) {
		let dc = node.getDataCube("data");
		dc = await Commons.reduce(node, dc, this.id);
		// ToDo processes: We don't know at this point how the bands in the GEE images/imagecollections are called.
		const dimensionName = node.getArgument("dimension");
		dc.dropDimension(dimensionName);
		return dc;
	}

}
