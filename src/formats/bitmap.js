import GeeProcessing from "../processes/utils/processing.js";
import GeeResults from "../processes/utils/results.js";
import DataCube from "../datacube/datacube.js";
import Utils from "../utils/utils.js";
import FileFormat, { EPSGCODE_PARAMETER, SIZE_PARAMETER } from "./fileformat.js";

export const EPSGCODE_PARAMETER_BITMAP = Object.assign({}, EPSGCODE_PARAMETER);
EPSGCODE_PARAMETER_BITMAP.default = 4326;
EPSGCODE_PARAMETER_BITMAP.description += 'Defaults to WGS 84 (EPSG Code 4326).';

const VISUALIZATION_PARAMETER = {
  collectionRenderer: {
    description: "For image collections (time series) a specific method combine the images into a single image can be chosen.",
    type: "string",
    enum: ["filmstrip", "mosaic"],
    default: "mosaic",
    optional: true
  },
  bands: {
    description: "Band selection for visualization",
    oneOf: [
      {
        title: "Grayscale",
        description: "Band selection a single band visualization",
        type: "object",
        required: [
          "gray"
        ],
        properties: {
          gray: {
            type: 'string',
            subtype: 'band-name',
            description: 'Band name being used for the grayscale channel.'
          }
        },
        additionalProperties: false
      },
      {
        title: "RGB",
        description: "Band selection a three band RGB visualization",
        type: "object",
        required: [
          "red",
          "green",
          "blue"
        ],
        properties: {
          red: {
            type: 'string',
            subtype: 'band-name',
            description: 'Band name being used as a red channel.'
          },
          green: {
            type: 'string',
            subtype: 'band-name',
            description: 'Band name being used for the green channel.'
          },
          blue: {
            type: 'string',
            subtype: 'band-name',
            description: 'Band name being used for the blue channel.'
          },
        },
        additionalProperties: false
      }
    ],
    default: null,
    optional: true
  },
  palette: {
    type: 'array',
    description: 'List of hex RGB colors used as palette for visualization, e.g. `#ffffff` for white.',
    default: null
  }
};

export default class BitmapLike extends FileFormat {

  constructor(title, description = '') {
    super(title, {}, description);
    this.addParameter('epsgCode', EPSGCODE_PARAMETER_BITMAP);
    this.addParameter('size', SIZE_PARAMETER);
    this.addParameters(VISUALIZATION_PARAMETER);
  }

  getGisDataTypes() {
    return ['raster'];
  }

  getFormatCode() {
    return null;
  }

  allowMultiple(parameters) {
    const renderer = parameters.collectionRenderer || 'mosaic';
    return renderer === 'filmstrip';
  }

  preprocess(context, dc, logger) {
    const ee = context.ee;
		const parameters = dc.getOutputFormatParameters();

		if (dc.hasXY() && parameters.epsgCode >= 1000) {
      dc.setCrs(parameters.epsgCode);
    }

    const palette = Array.isArray(parameters.palette) ? parameters.palette : null;

    let bands = [];
    if (parameters.red && parameters.green && parameters.blue){
      bands = [parameters.red, parameters.green, parameters.blue];
    }
    else if (parameters.gray){
      bands = [parameters.gray];
    }
    else {
      bands = dc.getEarthEngineBands().slice(0, 1);
      if (bands[0] !== GeeProcessing.BAND_PLACEHOLDER) {
        logger.warn("No valid set of bands specified in the output parameters. The first band will be used for a gray-value visualisation.");
      }
    }

    const visConfig = {min: 0, max: 255, bands, palette};

    const allowMultiple = this.allowMultiple(parameters);
    let eeData = GeeResults.toImageOrCollection(ee, logger, dc.getData(), allowMultiple);
    if (eeData instanceof ee.ImageCollection) {
      eeData = eeData.map(img => img.visualize(visConfig));
    }
    else {
      eeData = eeData.visualize(visConfig);
    }

    const dc2 = new DataCube(ee, dc);
    if (dc2.hasT() && !allowMultiple) {
      dc2.dimT().drop();
    }
    if (dc2.hasBands()) {
      const dimB = dc2.dimBands();
      if (bands.length > 1) {
        dimB.setValues(bands);
      }
      else {
        dimB.drop();
      }
    }

    return dc2.setData(eeData);
  }

  async retrieve(ee, dc) {
		const parameters = dc.getOutputFormatParameters();
    const img = dc.getData();

		let region = null;
		let crs = null;
		if (dc.hasXY()) {
			region = Utils.bboxToGeoJson(dc.getSpatialExtent());
			crs = Utils.crsToString(dc.getCrs());
		}

    const eeOpts = {
      format: this.getFormatCode(),
      dimensions: parameters.size || 1000,
      region,
      crs
    };
    const urlFunc = (img instanceof ee.ImageCollection) ? 'getFilmstripThumbURL' : 'getThumbURL';
    return await new Promise((resolve, reject) => {
      img[urlFunc](eeOpts, (url, err) => {
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
