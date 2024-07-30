import GeeResults from "../processes/utils/results.js";
import DataCube from "../datacube/datacube.js";
import Utils from "../utils/utils.js";
import FileFormat, { EPSGCODE_PARAMETER, SCALE_PARAMETER } from "./fileformat.js";
import HttpUtils from "../utils/http.js";

export default class GTiffFormat extends FileFormat {
  constructor(title = 'GeoTiff', parameters = {}) {
    super(title, parameters, "Cloud-optimized in batch jobs, not cloud-optimized otherwise.");
    this.addParameter('scale', SCALE_PARAMETER);
    this.addParameter('epsgCode', EPSGCODE_PARAMETER);
  }

  getGisDataTypes() {
    return ['raster'];
  }

  getFileExtension(/*parameters*/) {
    return '.tiff';
  }

  preprocess(mode, context, dc, logger) {
    const ee = context.ee;
		const parameters = dc.getOutputFormatParameters();
    const dc2 = new DataCube(ee, dc);
		if (dc2.hasXY() && parameters.epsgCode >= 1000) {
      dc2.setCrs(parameters.epsgCode);
    }
    if (dc2.hasT()) {
      dc2.dimT().drop();
    }
    const allowMultiple = (mode === GeeResults.BATCH);
    return dc2.setData(GeeResults.toImageOrCollection(ee, logger, dc.getData(), allowMultiple));
  }

  async retrieve(ee, dc) {
		const parameters = dc.getOutputFormatParameters();

		let region = null;
		let crs = null;
		if (dc.hasXY()) {
			region = Utils.bboxToGeoJson(dc.getSpatialExtent());
			crs = Utils.crsToString(dc.getCrs());
		}

    const data = dc.getData();
    if (data instanceof ee.Image) {
      const eeOpts = {
        scale: parameters.scale || 100,
        region,
        crs,
        format: 'GEO_TIFF'
      };
      return await new Promise((resolve, reject) => {
        data.getDownloadURL(eeOpts, (url, err) => {
          if (err) {
            reject(err);
          }
          else if (typeof url !== 'string' || url.length === 0) {
            reject('Download URL provided by Google Earth Engine is empty.');
          }
          else {
            resolve(HttpUtils.stream(url));
          }
        });
      });
    }
    else {
      throw new Error('Only single images are supported in this processing mode for GeoTIFF.');
    }
  }

  canExport() {
    return true;
  }

  async export(ee, dc, job) {
    return await GeeResults.exportToDrive(ee, dc, job, 'GeoTIFF', {
      cloudOptimized: true,
      // noData: NaN
    });
  }

}
