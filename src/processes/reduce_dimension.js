import GeeProcess from '../processgraph/process.js';

export default class reduce_dimension extends GeeProcess {

	async execute(node) {
		const dc = node.getDataCube("data");
		const callback = node.getCallback("reducer");
		const dimensionName = node.getArgument("dimension");
		const context = node.getArgument("context");
		if (!dc.hasDimension(dimensionName)) {
			throw new Error.DimensionNotAvailable({
				process: node.process_id,
				argument: "dimension"
			});
		}

		const dimension = dc.dim(dimensionName);

		const resultNode = await callback.execute({
			data: dc.getData(),
			context: context,
			executionContext: {
				type: "reducer",
				parameter: "dimension",
				dimension
			}
		});

    dimension.drop();
		dc.setData(resultNode.getResult());

		return dc;
	}

}
