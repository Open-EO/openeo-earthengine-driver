import GeeProcess from '../processgraph/process.js';
import GeeProcessing from './utils/processing.js';

export default class mask extends GeeProcess {

  static process(node, data, maskImageFn, masks = null) {
    const ee = node.ee;
    if (data instanceof ee.imageCollection) {
      if (masks instanceof ee.ImageCollection) {
        data = GeeProcessing.iterateInParallel(ee, data, masks, maskImageFn);
      }
      else if (masks instanceof ee.Image) {
        data = data.map(img => maskImageFn(img, masks));
      }
      else {
        throw new Error("The mask must be an Image or ImageCollection.");
      }
      return data;
    }
    else if (data instanceof ee.Image) {
      if (masks instanceof ee.Image) {
        return maskImageFn(data, masks);
      }
      else {
        throw new Error("The mask must be an Image.");
      }
    }
    else {
      throw new Error("The data must be an Image or ImageCollection.");
    }
  }

  executeSync(node) {
    let dc = node.getDataCubeWithEE("data");
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

    try {
      const data = mask.process(node, dc.getData(), maskImageFn, masks);
      return dc.setData(data);
    } catch (error) {
      throw node.invalidArgument("mask", error.message);
    }
  }

}
