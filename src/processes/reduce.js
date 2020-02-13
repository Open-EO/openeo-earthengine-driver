const { BaseProcess } = require('@openeo/js-processgraphs');
const Errors = require('../errors');
const DataCube = require('../processgraph/datacube');

// TODO: do we have to change this/reduce the dimension if we get multiple arguments back, e.g. from quantiles?
module.exports = class reduce extends BaseProcess {

	async execute(node) {
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
			resultDataCube = this.reduceSimple(dc, process.geeReducer(node));
		}
		else {
			// This is a complex reducer
			var values;
			var ic = dc.imageCollection();
			if (dimension.type === 'temporal') {
				values = ic.toList(ic.size());
			}
			else if (dimension.type === 'bands') {
				values = dimension.getValues().map(band => ic.select(band));
			}
			var resultNode = await callback.execute({
				data: values
			});
			resultDataCube = new DataCube(dc);
			resultDataCube.setData(resultNode.getResult());
		}
		// ToDo: We don't know at this point how the bands in the GEE images/imagecollections are called.
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

		if (!dc.isImageCollection() && !dc.isImage()) {
			throw new Error("Calculating " + reducerName + " not supported for given data type.");
		}
	
		dc.imageCollection(data => data.reduce(reducerFunc));

		// revert renaming of the bands following to the GEE convention
		var bands = dc.getBands();
		if (Array.isArray(bands) && bands.length > 0) {
			var renamedBands = bands.map(bandName => bandName + "_" + reducerName);
			dc.imageCollection(data => data.map(
				img => img.select(renamedBands).rename(bands)
			));
		}

		return dc;
	}

};