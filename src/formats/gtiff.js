import GeeResults from "../processes/utils/results.js";
import DataCube from "../datacube/datacube.js";
import Utils from "../utils/utils.js";
import FileFormat, { EPSGCODE_PARAMETER, SCALE_PARAMETER } from "./fileformat.js";

export default class GTiffFormat extends FileFormat {
  constructor(title = 'GeoTiff', parameters = {}) {
    super(title, parameters);
    this.addParameter('scale', SCALE_PARAMETER);
    this.addParameter('epsgCode', EPSGCODE_PARAMETER);
    this.addParameter('zipped', {
      type: 'boolean',
      description: 'Pack the GeoTiff files into ZIP files, one file per band.',
      default: false
    });
  }

  getGisDataTypes() {
    return ['raster'];
  }

  getFileExtension(parameters) {
    return parameters.zipped ? '.zip' : '.tiff';
  }

  preprocess(node, allowMultiple) {
    const dc = node.getResult();
		const parameters = dc.getOutputFormatParameters();
    const dc2 = new DataCube(node.ee, dc);
		if (dc2.hasXY() && parameters.epsgCode >= 1000) {
      dc2.setCrs(parameters.epsgCode);
    }
    if (!allowMultiple && dc2.hasT()) {
      dc2.dimT().drop();
    }
    return dc2.setData(GeeResults.toImageOrCollection(node, dc.getData(), allowMultiple));
  }

  async retrieve(ee, dc) {
		const parameters = dc.getOutputFormatParameters();

		let region = null;
		let crs = null;
		if (dc.hasXY()) {
			region = Utils.bboxToGeoJson(dc.getSpatialExtent());
			crs = Utils.crsToString(dc.getCrs());
		}

    const format = parameters.zipped ? 'ZIPPED_GEO_TIFF' : 'GEO_TIFF';

    const data = dc.getData();
    if (data instanceof ee.ImageCollection) {
      // todo: implement
    }
    else if (data instanceof ee.Image) {
      const eeOpts = {
        scale: parameters.scale || 100,
        region,
        crs,
        format
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
            resolve(url);
          }
        });
      });
    }

  }

}
