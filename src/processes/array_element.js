import GeeProcess from '../processgraph/process.js';
import Errors from '../utils/errors.js';

export default class array_element extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const data = node.getArgumentAsEE("data");
    let index = node.getArgument("index", null);
    let label = node.getArgument("label", null);
    // const return_nodata = node.getArgument("return_nodata", false);

    if (index !== null && label !== null) {
      throw new Errors.ArrayElementParameterConflict();
    }
    else if (index === null && label === null) {
      throw new Errors.ArrayElementParameterMissing();
    }

    // As it's all on GEE's side, we can't throw an ArrayElementNotAvailable here
    // throw new Errors.ArrayElementNotAvailable();
    const executionContext = node.getExecutionContext();
    if (data instanceof ee.List) {
      if (index !== null) {
        return data.get(index);
      }
      throw new Errors.ArrayNotLabeled();
    }
    else if (data instanceof ee.Array && index !== null) {
      if (index !== null) {
        return data.get(index);
      }
      throw new Errors.ArrayNotLabeled();
    }
    else if (data instanceof ee.Dictionary) {
      if (index !== null) {
        return data.values().get(label);
      }
      else {
        return data.get(label);
      }
    }
    else if (executionContext && executionContext.type === "reducer") {
      const dim = executionContext.dimension;
      const dimType = dim.getType();
      if (dimType === "bands") {
        if (label === null) {
          const values = dim.getValues();
          if (Array.isArray(values) && index < values.length) {
            label = values[index];
          }
          else {
            throw new Errors.ArrayElementNotAvailable({ x: index });
          }
        }
        if (data instanceof ee.ImageCollection || data instanceof ee.Image) {
          return data.select([label]);
        }
      }
      else if (dimType === "temporal") {
        if (data instanceof ee.ImageCollection) {
          if (label !== null) {
            // Make the given label to a 1 second interval to ensure we get consistent results
            const range = ee.Date(label).getRange("second");
            return data.filter(ee.Filter.date(range));
          }
          else {
            // todo: Compute the range for the index based on the step defined for the dimension
            throw node.invalidArgument("index", "Selecting temporal labels based on the index is not implemented yet.");
          }
        }
      }
      else {
        throw node.invalidArgument(executionContext.parameter, "Unsupported dimension type: " + dimType);
      }
    }
    else {
      throw node.invalidArgument("data", "Unsupported data type.");
    }
  }
}
