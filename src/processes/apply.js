import { BaseProcess } from '@openeo/js-processgraphs';
import Errors from '../utils/errors.js';
import ProcessGraph from '../processgraph/processgraph.js';

export default class apply extends BaseProcess {

	async execute(node) {
		const dc = node.getDataCube("data");

		const callback = node.getArgument("process");
		if (!(callback instanceof ProcessGraph)) {
			throw new Errors.ProcessArgumentInvalid({
				process: this.id,
				argument: 'process',
				reason: 'No process specified.'
			});
		}

		const resultNode = await callback.execute({
			x: dc.getData(),
			context: node.getArgument("context")
		});
		dc.setData(resultNode.getResult());
		return dc;
	}

}
