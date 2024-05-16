import GeeTypes from "./types.js";

export function copyProps(ee, img, source) {
	// copyProperties returns a ComputedObject, so cast back to ee.Image
	// See: https://issuetracker.google.com/issues/341002190
	// Once fixed the ee parameter can be removed
	return ee.Image(img.copyProperties(source, source.propertyNames()));
}

const GeeProcessing = {

	BAND_PLACEHOLDER: "#",

	applyBinaryNumericalFunction(node, func, xParameter = "x", yParameter = "y") {
		const ee = node.ee;
		let x = node.getArgumentAsEE(xParameter);
		let y = node.getArgumentAsEE(yParameter);

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
				return copyProps(ee, func(ee.Image(a), b), b);
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
					// todo: performance optimization
					return x.map(imgA => {
						const id = imgA.get("system:index");
						const imgB = y.filter(ee.Filter.eq("system:index", id)).first();
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

	reduceNumericalFunction(node, reducerName, dataParameter = "data") {
		const ee = node.ee;
		const data = node.getArgumentAsEE(dataParameter);
		const executionContext = node.getExecutionContext();
		const reducer = ee.Reducer[reducerName]();
		if (data instanceof ee.List) {
			return data.reduce(reducer);
		}
		else if (data instanceof ee.Array) {
			// We assume ee.Array is always one-dimensional (similar to ee.List)
			return data.reduce(reducer, [0]);
		}
		else if (executionContext && executionContext.type === "reducer") {
			const dimType = executionContext.dimension.getType();
			if (dimType === "bands") {
				const imgReducer = img => copyProps(ee, img.reduce(reducer), img);
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
						return data
							.reduce(reducer)
							.map(img => img.regexpRename(`^(.+)_${reducerName}$`, "$1"));
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
