import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';
import GeeTypes from './utils/types.js';

export default class eq extends GeeProcess {

	static process(node, binaryFunc, equals = true, not = false, xParameter = "x", yParameter = "y") {
		const x = node.getArgumentAsEE(xParameter);
		const y = node.getArgumentAsEE(yParameter);
		const ee = node.ee;
		if (x instanceof ee.String || y instanceof ee.String) {
			if (!equals) {
				return ee.Number(0); // false
			}
			let bool;
			if (y instanceof ee.String) {
				bool = y.equals(x);
			}
			else {
				bool = x.equals(y);
			}
			let result = GeeTypes.toNumber(ee, bool);
			if (not) {
				result = result.not();
			}
			return result;
		}
		if (x instanceof ee.String) {
			return equals ? x.equals(y) : false;
		}
		if (y instanceof ee.String) {
			return equals ? y.equals(x) : false;
		}
		return GeeProcessing.applyBinaryNumericalFunction(node, binaryFunc);
	}

	executeSync(node) {
		return eq.process(node, (a, b) => a.eq(b));
	}

}
