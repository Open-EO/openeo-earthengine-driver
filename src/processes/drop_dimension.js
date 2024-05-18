import GeeProcess from '../processgraph/process.js';
import Errors from '../utils/errors.js';

export default class drop_dimension extends GeeProcess {

  executeSync(node) {
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
    let values = dimension.getValues();
    // If values are null, we need to load them from the server
    if (values === null) {
      const data = dc.getData();
      if (dimType === "bands") {
        if (data instanceof ee.ImageCollection) {
          values = data.first().bandNames().getInfo();
        }
        else if (data instanceof ee.Image) {
          values = data.bandNames().getInfo();
        }
        else {
          values = [];
        }
      }
      else if (dimType === "temporal") {
        if (data instanceof ee.ImageCollection) {
          values = data.length().getInfo();
        }
        else {
          values = [];
        }
      }
    }

    if (values.length < 2) {
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
