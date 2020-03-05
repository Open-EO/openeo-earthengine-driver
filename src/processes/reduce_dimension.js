const { BaseProcess } = require('@openeo/js-processgraphs');
const Errors = require('../errors');
const ProcessGraph = require('../processgraph/processgraph');

module.exports = class reduce_dimension extends BaseProcess {

	async execute(node) {
		var dc = node.getDataCube("data");

		var dimensionName = node.getArgument("dimension");
		var dimension = dc.getDimension(dimensionName);
		if (dimension.type !== 'temporal' && dimension.type !== 'bands') {
			throw new Errors.ProcessArgumentInvalid({
				process: this.spec.id,
				argument: 'dimension',
				reason: 'Reducing dimension types other than `temporal` or `bands` is currently not supported.'
			});
		}

		var callback = node.getArgument("reducer");
		if (!(callback instanceof ProcessGraph)) {
			throw new Errors.ProcessArgumentInvalid({
				process: this.spec.id,
				argument: 'reducer',
				reason: 'No reducer specified.'
			});
		}
		else if (callback.getNodeCount() === 1) {
			// This is a simple reducer with just one node
			var childNode = callback.getResultNode();
			var process = callback.getProcess(childNode);
			if (typeof process.geeReducer !== 'function') {
				throw new Errors.ProcessArgumentInvalid({
					process: this.spec.id,
					argument: 'reducer',
					reason: 'The specified reducer is invalid.'
				});
			}
			console.log("Bypassing node " + childNode.id + "; Executing as native GEE reducer instead.");
			dc = this.reduceSimple(dc, process.geeReducer(node));
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
				data: values,
				context: node.getArgument("context")
			});
			dc.setData(resultNode.getResult());

			// If we are reducing over bands we need to set the band name in GEE to a default one, e.g., "#"
			if (dimension.type === 'bands') {
				dc.imageCollection(data => data.map(
					img => img.select(dc.imageCollection().first().bandNames()).rename(["#"])
				));
			}
		}

		// ToDo: We don't know at this point how the bands in the GEE images/imagecollections are called.
		dc.dropDimension(dimensionName);
		return dc;
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
			throw new Error("Calculating " + reducerName + " not supported for given data type: " + dc.objectType());
		}
	
		dc.imageCollection(data => data.reduce(reducerFunc));

		// revert renaming of the bands following to the GEE convention
		var bandNames = dc.getEarthEngineBands();
		if (bandNames.length > 0) {
			// Map GEE band names to openEO band names
			var rename = {};
			for(let bandName of bandNames) {
				let geeBandName = bandName + "_" + reducerName;
				rename[geeBandName] = bandName;
			}
			
			dc.imageCollection(data => data.map(
				img => {
					// Create a GEE list with expected band names
					var geeBands = img.bandNames();
					for(var geeBandName in rename) {
						geeBands = geeBands.replace(geeBandName, rename[geeBandName]);
					}
			
					// Rename bands
					return img.rename(geeBands);
				}
			));
		}

		return dc;
	}

};