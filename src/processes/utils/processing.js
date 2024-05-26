import GeeTypes from "./types.js";

export function copyProps(ee, img, source) {
	// copyProperties returns a ComputedObject, so cast back to ee.Image
	// See: https://issuetracker.google.com/issues/341002190
	// Once fixed the ee parameter can be removed
	return ee.Image(img.copyProperties(source, source.propertyNames()));
}

const GeeProcessing = {

	BAND_PLACEHOLDER: "#",

	evaluate(obj) {
		return new Promise((resolve, reject) => {
			return obj.evaluate((success, failure) => {
				if (success) {
					return resolve(success);
				} else {
					return reject(failure);
				}
			});
		});
	},

	iterateInParallel(ee, collectionA, collectionB, func, sortBy = null) {
		if (sortBy !== null) {
			collectionA = collectionA.sort(sortBy)
			collectionB = collectionB.sort(sortBy);
		}
		let counter = ee.Number(0);
		return collectionA.map(imgA => {
			const imgB = collectionB.toList(1, counter).get(0);
			counter = counter.add(1);
			return func(imgA, imgB);
		});
	},

	applyBinaryNumericalFunction(node, func, xParameter = "x", yParameter = "y", xDefault = undefined, yDefault = undefined) {
		const ee = node.ee;

		let x = node.getArgumentAsEE(xParameter, xDefault);
		if (!xParameter) {
			xParameter = 'n/a';
		}
		let y = node.getArgumentAsEE(yParameter, yDefault);
		if (!yParameter) {
			yParameter = 'n/a';
		}

		const convertToList = (x instanceof ee.List || y instanceof ee.List) && !(x instanceof ee.Array || y instanceof ee.Array);
		if (x instanceof ee.List) {
			x = GeeTypes.toArray(ee, x);
		}
		if (y instanceof ee.List) {
			y = GeeTypes.toArray(ee, y);
		}

		const eeFunc = (a, b) => {
			if (GeeTypes.isSameNumType(ee, a, b) || (GeeTypes.isNumType(ee, a) && b instanceof ee.Number)) {
				let result = func(a, b);
				if (a instanceof ee.Image) {
					result = copyProps(ee, result, a);
				}
				return result;
			}
			else if (a instanceof ee.Image) {
				return copyProps(ee, func(a, ee.Image(b)), a);
			}
			else if (a instanceof ee.Array) {
				return func(a, b.toArray());
			}
			else if (a instanceof ee.Number && b instanceof ee.Image) {
				// If the first argument is a number and the second an image, we have to
				// rename the bands as the band in the result image may be named "constant"
				return copyProps(ee, func(ee.Image(a), b), b).rename(b.bandNames());
			}
			else if (a instanceof ee.Number && b instanceof ee.Array) {
				a = GeeTypes.toArray(ee, ee.List.repeat(a, b.toList().length()));
				return func(a, b);
			}

			throw node.invalidArgument(yParameter, "Combination of unsupported data types.");
		};

		let result;
		if (x instanceof ee.ImageCollection && y instanceof ee.ImageCollection) {
			const executionContext = node.getExecutionContext();
			if (executionContext && executionContext.type === "reducer") {
				const dimType = executionContext.dimension.getType();
				if (dimType === "bands") {
					// result = GeeProcessing.iterateInParallel(ee, x, y, eeFunc);
					return x.combine(y).map(img => {
						const bands = img.bandNames();
						const imgA = img.select([bands.get(0)]);
						const imgB = img.select([bands.get(1)]);
						return eeFunc(imgA, imgB);
					});
				}
				// todo: implement for temporal dimension?
			}
			throw node.invalidArgument(yParameter, "Can't apply binary function to two image collections.");
		}
		else if (x instanceof ee.ImageCollection && GeeTypes.isNumType(ee, y)) {
			result = x.map(img => eeFunc(img, y));
		}
		else if (GeeTypes.isNumType(ee, x) && y instanceof ee.ImageCollection) {
			result = y.map(img => eeFunc(x, img));
		}
		else if (GeeTypes.isNumType(ee, x) && GeeTypes.isNumType(ee, y)) {
			result = eeFunc(x, y);
		}
		else {
			const param = GeeTypes.isNumType(ee, x) ? yParameter : xParameter;
			throw node.invalidArgument(param, "Combination of unsupported data types.");
		}

		if (convertToList) {
			return result.toList();
		}
		else {
			return result;
		}
	},

	applyUnaryNumericalFunction(node, func, dataParameter = "x") {
		const ee = node.ee;
		const data = node.getArgumentAsEE(dataParameter);
		if (data instanceof ee.List) {
			return func(GeeTypes.toArray(ee, data)).toList();
		}
		else if (data instanceof ee.ImageCollection) {
			return data.map(img => copyProps(ee, func(img), img));
		}
		else if (data instanceof ee.Image) {
			return copyProps(ee, func(data), data);
		}
		else if (GeeTypes.isNumType(ee, data)) {
			return func(data);
		}

		throw node.invalidArgument(dataParameter, "Unsupported data type.");
	},

	reduceNumericalFunction(node, reducerSpec, binaryFunc = null, dataParameter = "data") {
		let reducerName;
		let bandSuffix;
		if (Array.isArray(reducerSpec)) {
			reducerName = reducerSpec[0];
			bandSuffix = reducerSpec[1];
		}
		else {
			reducerName = reducerSpec;
			bandSuffix = reducerSpec
		}

		const ee = node.ee;
		let data;

		// If the data is an array that contains other results, we likely can't use
		// the GEE reducers and must use the alternative "binary" GEE operations.
		// For example, we can use `add` instead of `sum`.
		if (binaryFunc) {
			data = node.getArgument(dataParameter);
			if (Array.isArray(data) && data.some(x => typeof x !== 'number')) {
				return data.reduce((a, b) => GeeProcessing.applyBinaryNumericalFunction(node, binaryFunc, null, null, a, b), 0);
			}
		}

		data = node.getArgumentAsEE(dataParameter);
		const executionContext = node.getExecutionContext();
		const reducer = ee.Reducer[reducerName]();
		if (data instanceof ee.List) {
			return ee.List(data.reduce(reducer));
		}
		else if (data instanceof ee.Array) {
			// We assume ee.Array is always one-dimensional (similar to ee.List)
			return ee.Array(data.reduce(reducer, [0]));
		}
		else if (executionContext && executionContext.type === "reducer") {
			const dimType = executionContext.dimension.getType();
			if (dimType === "bands") {
				const imgReducer = img => copyProps(ee, ee.Image(img.reduce(reducer)), img);
				if (data instanceof ee.ImageCollection) {
					return data.map(imgReducer);
				}
				else if (data instanceof ee.Image) {
					return imgReducer(data);
				}
				throw node.invalidArgument(dataParameter, "Unsupported data type for band reducer.");
			}
			else if (dimType === "temporal") {
				if (data instanceof ee.ImageCollection) {
					// Most reducers are available as functions on the ImageCollection class,
					// which don't rename the bands. So this is preferred.
					if (typeof data[reducerName] === "function") {
						return data[reducerName]();
					}
					// In all other cases we need to use the reduce function and rename the bands
					// The bands are named <band name>_<reducer name>
					else {
						return ee.ImageCollection(data.reduce(reducer))
							.map(img => img.regexpRename(`^(.+)_${bandSuffix}$`, "$1"));
					}
				}
				throw node.invalidArgument(dataParameter, "Unsupported data type for temporal reducer.");
			}
			else {
				throw node.invalidArgument(executionContext.parameter, "Unsupported dimension type: " + dimType);
			}
		}
		else {
			throw node.invalidArgument(dataParameter, "Unsupported data type.");
		}
	}

};

export default GeeProcessing;
