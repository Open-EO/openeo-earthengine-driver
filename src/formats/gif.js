import Utils from "../utils/utils.js";
import BitmapLike from "./bitmap.js";

export default class GifFormat extends BitmapLike {
  constructor() {
    super('GIF (animated)', 'Either animated or static.');
    this.removeParameter('collectionRenderer');
    this.addParameter('framesPerSecond', {
      type: 'number',
      description: 'Number of images that are shown per second.',
      default: 1,
      optional: true,
      exclusiveMinimum: 0
    });
  }

  getFileExtension(/*parameters*/) {
    return '.gif';
  }

  getFormatCode() {
    return 'gif';
  }

  allowMultiple() {
    return true;
  }

  async retrieve(ee, dc) {
		const parameters = dc.getOutputFormatParameters();
    const img = ee.ImageCollection(dc.getData());

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
      crs,
      framesPerSecond: parameters.framesPerSecond || 1
    };
    return await new Promise((resolve, reject) => {
      img.getVideoThumbURL(eeOpts, (url, err) => {
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
