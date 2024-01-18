import { BaseProcess } from '@openeo/js-processgraphs';
import Errors from '../utils/errors.js';

export default class array_element extends BaseProcess {

  async execute(node) {
    const data = node.getArgument("data");
    let index = node.getArgument("index", null);
    const label = node.getArgument("label", null);
    const return_nodata = node.getArgument("return_nodata", false);

    if (index !== null && label !== null) {
      throw new Errors.ArrayElementParameterConflict();
    }

    if (index === null && label === null) {
      throw new Errors.ArrayElementParameterMissing();
    }

    const parentNode = node.getParent();
    if (label !== null && parentNode) {
      // ToDo processes: check data type of data
      const dimensionName = parentNode.getArgument("dimension");
      const dc = parentNode.getArgument("data");
      const dimension = dc.getDimension(dimensionName);
      const labels = dimension.getValues();
      if (!labels.includes(label)) {
        throw new Errors.ArrayElementNotAvailable();
      }
      else {
        // ToDo processes: only bands is currently supported
        if (dimension.type !== "bands") {
          throw new Errors.ProcessArgumentInvalid({
            process: this.id,
            argument: 'dimension',
            reason: 'Only dimension "bands" is currently supported.'
          });
        }
        else {
          index = labels.indexOf(label);
        }
      }
    }

    if (Array.isArray(data) && typeof data[index] !== 'undefined') {
      return data[index];
    }
    else if (return_nodata) {
      return null;
    }
    else {
      throw new Errors.ArrayElementNotAvailable();
    }
  }

}
