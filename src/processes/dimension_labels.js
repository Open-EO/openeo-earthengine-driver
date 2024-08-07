import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';
import GeeTypes from './utils/types.js';
import Errors from '../utils/errors.js';

export default class dimension_labels extends GeeProcess {

  toISO(ee, timestamp) {
    return GeeTypes.toString(ee, ee.Date(timestamp));
  }

	async execute(node) {
    const ee = node.ee;
		const dimension = node.getArgument("dimension");
		const dc = node.getDataCube("data");
		if (!dc.hasDimension(dimension)) {
			throw new Errors.DimensionNotAvailable({
				process: node.process_id,
				parameter: "dimension"
			});
		}

    const dim = dc.dim(dimension);
    const dimType = dim.getType();

    const data = dc.getData();
		if (dimType === "bands") {
      if (data instanceof ee.ImageCollection) {
        const func = (img, list) => ee.List(list).cat(img.bandNames().remove(GeeProcessing.BAND_PLACEHOLDER));
        const bands = ee.List(data.iterate(func, ee.List([])));
        return bands.distinct();
      }
      else if (data instanceof ee.Image) {
        return data.bandNames().remove(GeeProcessing.BAND_PLACEHOLDER);
      }
      else {
        return ee.List([]);
      }
		}
		else if (dimType === "temporal") {
      const toISO = timestamp => GeeTypes.toString(ee, ee.Date(timestamp));
      if (data instanceof ee.ImageCollection) {
        return data.aggregate_array("system:time_start")
          .map(toISO)
          .distinct()
          .sort();
      }
      else if (data instanceof ee.Image) {
        const isoDateTime = toISO(data.get("system:time_start"));
        return ee.List([isoDateTime]);
      }
      else {
        return ee.List([]);
      }
		}
    else {
      throw node.invalidArgument("dimension", "Unsupported dimension type.");
    }
	}

}
