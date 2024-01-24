import GeeProcess from '../processgraph/process.js';

export default class reduce_dimension extends GeeProcess {

	static process(dc, reducer, dimensionName, context) {
		const dimension = dc.getDimension(dimensionName);

		let data;
		const ic = dc.imageCollection();
		if (dimension.type === 'temporal' || dimension.type === 'other') {
			data = ic.toList(ic.size());
		}
		else if (dimension.type === 'bands') {
			data = dimension.getValues().map(band => ic.select(band));
		}
		reducer.setArguments({ data, context });
		const resultNode = reducer.executeSync();
		dc.setData(resultNode.getResult());
		return dc;
	}

	async execute(node) {
		let dc = node.getDataCube('data');
		const reducer = node.getCallback('reducer');
		const dimName = node.getArgument('dimension');
		const context = node.getArgument('context');

		const dimension = dc.getDimension(dimName);
		if (["temporal", "bands"].includes(dimension.type)) {
			throw this.invalidArgument('dimension', `Cannot reduce dimension of type ${dimension.type}`);
		}

		dc = reduce_dimension.process(dc, reducer, dimName, context);
		dc.getDimension(dimName).drop();

		return dc;
	}

}
