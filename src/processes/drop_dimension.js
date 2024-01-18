import { BaseProcess } from '@openeo/js-processgraphs';
import Errors from '../utils/errors.js';

export default class drop_dimension extends BaseProcess {

  async execute(node) {
    const dc = node.getArgument('data');
    let dimensionName = node.getArgument('name');
    let dimension;

    if (dc.hasDimension(dimensionName) === false) {
      throw new Errors.DimensionNotAvailable({
        process: this.id,
        argument: 'name'
      });
    }

    dimension = dc.getDimension(dimensionName);

    if (dimension.values.length > 1) {
      throw new Errors.DimensionLabelCountMismatch({
        process: this.id,
        argument: 'name'
      });
    }

    dc.dropDimension(dimensionName);
    return dc;
  }

}
