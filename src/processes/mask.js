import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class mask extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    let data = node.getArgumentAsEE("data");
    let masks = node.getArgumentAsEE("mask");
    const replacement = node.getArgumentAsEE("replacement", null);

    // todo: resample if needed

    const maskImageFn = (img, maskImg) => {
      // Mask image / Set no-data
      const maskedImg = img.updateMask(maskImg);
      // Replace no-data with replacement value
      if (replacement !== null) {
        return maskedImg.unmask(replacement);
      }
      else {
        return maskedImg;
      }
    };

    if (data instanceof ee.imageCollection) {
      if (masks instanceof ee.ImageCollection) {
        return GeeProcessing.iterateInParallel(ee, data, masks, maskImageFn)
      }
      else if (masks instanceof ee.Image) {
        return data.map(img => maskImageFn(img, masks));
      }
      else {
        throw node.invalidArgument("mask", "The mask must be an Image or ImageCollection.");
      }
    }
    else if (data instanceof ee.Image) {
      if (masks instanceof ee.Image) {
        return maskImageFn(data, masks);
      }
      else {
        throw node.invalidArgument("mask", "The mask must be an Image.");
      }
    }
    else {
      throw node.invalidArgument("data", "The data must be an Image or ImageCollection.");
    }
  }

}
