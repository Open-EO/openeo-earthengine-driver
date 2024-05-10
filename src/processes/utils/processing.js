import GeeTypes from "./types.js";

const GeeProcessing = {

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
			if (GeeTypes.isSameNumType(ee, a, b)) {
				return func(a, b);
			}
			else if (GeeTypes.isNumType(ee, a) && b instanceof ee.Number) {
				return func(a, b);
			}
			else if (a instanceof ee.Image) {
				return func(a, ee.Image(b));
			}
			else if (a instanceof ee.Array) {
				return func(a, b.toArray());
			}
			else if (a instanceof ee.Number && b instanceof ee.Image) {
				a = ee.Image(a).copyProperties({ source: b, properties: b.propertyNames() });
				return func(a, b);
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
		else if (GeeTypes.isNumType(ee, data)) {
			return func(data);
		}
		else if (data instanceof ee.ImageCollection) {
			return data.map(img => func(img));
		}

		throw node.invalidArgument(dataParameter, "Unsupported data type.");
	},

	reduceNumericalFunction(node, reducerFunc = null, dataParameter = "data") {
		const ee = node.ee;
		const data = node.getArgumentAsEE(dataParameter);
		const executionContext = node.getExecutionContext();
		const reducer = reducerFunc(ee);
		if (data instanceof ee.List) {
			return data.reduce(reducer());
		}
		else if (data instanceof ee.Array) {
			// We assume ee.Array is always one-dimensional (similar to ee.List)
			return data.reduce(reducer(), [0]);
		}
		else if (executionContext && executionContext.type === "reducer") {
			const dimType = executionContext.dimension.getType();
			if (dimType === "bands") {
				if (data instanceof ee.ImageCollection) {
					return data.map(img => img.reduce(reducer()));
				}
				else if (data instanceof ee.Image) {
					return data.reduce(reducer());
				}
				throw node.invalidArgument(dataParameter, "Unsupported data type for band reducer.");
			}
			else if (dimType === "temporal") {
				if (data instanceof ee.ImageCollection) {
					return data.reduce(reducer());
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
