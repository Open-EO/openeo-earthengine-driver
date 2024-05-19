import GeeProcess from '../processgraph/process.js';

export default class apply extends GeeProcess {

	async execute(node) {
		const dc = node.getDataCube("data");
		const callback = node.getCallback("process");
		const resultNode = await callback.execute({
			x: dc.getData(),
			context: node.getArgument("context")
		});
		return dc.setData(resultNode.getResult());
	}

}
