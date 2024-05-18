import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';
import Errors from '../utils/errors.js';

export default class reduce_dimension extends GeeProcess {

	async execute(node) {
		const dc = node.getDataCube("data");
		const callback = node.getCallback("reducer");
		const dimensionName = node.getArgument("dimension");
		const context = node.getArgument("context");
		if (!dc.hasDimension(dimensionName)) {
			throw new Errors.DimensionNotAvailable({
				process: node.process_id,
				parameter: "dimension"
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

		let result = resultNode.getResult();

		// Bands are always present in images, so we rename them to a placeholder
		// if officially no bands are present in the datacube anymore
		if (dimension.getType() === "bands") {
			const ee = node.ee;
			if (result instanceof ee.ImageCollection) {
				result = result.map(img => img.rename(GeeProcessing.BAND_PLACEHOLDER));
			}
			else if (result instanceof ee.Image) {
				result = result.rename(GeeProcessing.BAND_PLACEHOLDER);
			}
		}

    dimension.drop();
		dc.setData(result);

		return dc;
	}

}
