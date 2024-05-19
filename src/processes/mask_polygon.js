import GeeProcess from '../processgraph/process.js';
import If from './if.js';

export default class mask_polygon extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const dc = node.getDataCubeWithEE("data");
    const geometryMask = node.getArgumentAsFeatureLikeEE("mask");
    const replacement = node.getArgumentAsEE("replacement", null);
    const inside = node.getArgumentAsNumberEE("inside", false);

    const maskFn = (img, geometries) => {
      let maskImg = ee.Image.constant(1).clip(geometries).mask();
      maskImg = ee.Image(If.process(inside, maskImg.not(), maskImg));
      img = img.updateMask(maskImg);
      if (replacement !== null) {
        img = img.unmask(replacement);
      }
    };

    let data = dc.getData();
    if (data instanceof ee.ImageCollection) {
      data = data.map(img => maskFn(img, geometryMask));
    }
    else if (data instanceof ee.Image) {
      data = maskFn(data, geometryMask);
    }
    else {
      throw new Error("The data must be an Image or ImageCollection.");
    }
    return dc.setData(data);
  }

}
