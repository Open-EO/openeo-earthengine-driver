const Process = require('../processgraph/process');
const Errors = require('../errors');

// TODO: do we have to change this/reduce the dimension if we get multiple arguments back, e.g. from quantiles?
module.exports = class reduce extends Process {

	async execute(node, context) {
		var dc = node.getData("data");

		var dimensionName = node.getArgument("dimension");
		var dimension = dc.getDimension(dimensionName);
		if (dimension.type !== 'temporal' && dimension.type !== 'bands') {
			throw new Errors.ProcessArgumentInvalid({
				process: this.schema.id,
				argument: 'dimension',
				reason: 'Reducing dimension types other than `temporal` or `bands` is currently not supported.'
			});
		}

		var resultDataCube;
		var callback = node.getArgument("reducer");
		if (callback.getNodeCount() === 1) {
			// This is a simple reducer with just one node
			var process = callback.getProcess(callback.getResultNode());
			if (typeof process.geeReducer !== 'function') {
				throw new Errors.ProcessArgumentInvalid({
					process: this.schema.id,
					argument: 'reducer',
					reason: 'The specified reducer is invalid.'
				});
			}
			resultDataCube = this.reduceSimple(dc, process.geeReducer());
		}
		else {
			var values;
			if (dimension.type === 'temporal') {
				var ic = data.imageCollection();
				values = ic.toList();
			}
			else if (dimension.type === 'bands') {
				var ic = data.imageCollection();
				// ToDo: Ensure that the bands have a fixed order!
				values = data.getBands().map(band => ic.select(band));
			}
			// This is a complex reducer
//			var resultNode = this.reduceComplex();
			var resultNode = await callback.execute({
				data: ic,
				values: values
			});
			resultDataCube = resultNode.getResult();
		}
		resultDataCube.dropDimension(dimensionName);
		return resultDataCube;
	}

	reduceSimple(dc, reducerFunc, reducerName = null) {
		if (reducerName === null) {
			if (typeof reducerFunc === 'string') {
				reducerName = reducerFunc;
			}
			else {
				throw new Error("The parameter 'reducerName' must be specified.");
			}
		}

		var bands = dc.getBands();
		var renamedBands = bands.map(bandName => bandName + "_" + reducerName);
		if (dc.isImageCollection()) {
			dc.imageCollection(data => data.reduce(reducerFunc).map(
				// revert renaming of the bands following to the GEE convention
				image => image.select(renamedBands).rename(bands)
			));
		}
		else if (dc.isImage()) {
			// reduce and revert renaming of the bands following to the GEE convention
			dc.image(img => img.reduce(reducerFunc).select(renamedBands).rename(bands));
		}
		else if (dc.isArray()) {
			dc.array(data => data.reduce(reducerFunc));
		}
		else {
			throw new Error("Calculating " + reducerName + " not supported for given data type.");
		}
		return dc;
	}

	reduceComplex() {

	}

};