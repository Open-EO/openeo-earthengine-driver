import GeeProcess from '../processgraph/process.js';
import Errors from '../utils/errors.js';
import GeeProcessing from './utils/processing.js';

export default class drop_dimension extends GeeProcess {

  async execute(node) {
    const ee = node.ee;
    const dc = node.getDataCubeWithEE('data');
    const dimensionName = node.getArgument('name');
    if (!dc.hasDimension(dimensionName)) {
      throw new Errors.DimensionNotAvailable({
        process: this.id,
        parameter: 'name'
      });
    }

    const dimension = dc.getDimension(dimensionName);
    const dimType = dimension.getType();
    if (dimType !== "bands" && dimType !== "temporal") {
      throw node.invalidArgument("name", "Selected dimension type can't be dropped.");
    }

    // Shortcut for bands, we don't need to load from the server
    const values = dimension.getValues();
    let labelCount = 0;
    // If values are null, we need to load them from the server
    if (Array.isArray(values)) {
      labelCount = values.length;
    }
    else {
      let counter;
      const data = dc.getData();
      if (dimType === "bands") {
        if (data instanceof ee.ImageCollection) {
          counter = data.first().bandNames().length();
        }
        else if (data instanceof ee.Image) {
          counter = data.bandNames().length();
        }
      }
      else if (dimType === "temporal") {
        if (data instanceof ee.ImageCollection) {
          counter = data.length();
        }
      }

      if (counter) {
        labelCount = await GeeProcessing.evaluate(counter);
      }
    }

    if (labelCount < 2) {
      dimension.drop();
    }
    else {
      throw new Errors.DimensionLabelCountMismatch({
        process: this.id,
        parameter: 'name'
      });
    }

    return dc;
  }

}
