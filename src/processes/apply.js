import { BaseProcess } from '@openeo/js-processgraphs';
import Errors from '../utils/errors.js';
import ProcessGraph from '../processgraph/processgraph.js';

export default class apply extends BaseProcess {

	async execute(node) {
		var dc = node.getDataCube("data");

		var callback = node.getArgument("process");
		if (!(callback instanceof ProcessGraph)) {
			throw new Errors.ProcessArgumentInvalid({
				process: this.id,
				argument: 'process',
				reason: 'No process specified.'
			});
		}

		var resultNode = await callback.execute({
			x: dc.getData(),
			context: node.getArgument("context")
		});
        dc.setData(resultNode.getResult());
		return dc;
	}

}
