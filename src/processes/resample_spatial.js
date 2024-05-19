import GeeProcess from '../processgraph/process.js';

export default class resample_spatial extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const dc = node.getDataCubeWithEE("data");
    const resolution = node.getArgument("resolution", 0);
    let projection = node.getArgument("projection", null);
    const method = node.getArgument("method", "near");

    const resampleFn = img => {
      if (method !== "near") {
        img = img.resample(method);
      }
      let eeProjection;
      if (projection === null) {
        eeProjection = img.projection();
      }
      else {
        eeProjection = `EPSG:${projection}`;
      }
      return img.reproject(eeProjection, null, resolution);
    };

    let data = dc.getData();
    if (data instanceof ee.ImageCollection) {
      data = data.map(img => resampleFn(img));
    }
    else if (data instanceof ee.Image) {
      data = resampleFn(data);
    }
    else {
      throw new Error("The data must be an Image or ImageCollection.");
    }

    if (projection !== null) {
      dc.setCrs(projection);
    }
    if (resolution !== 0) {
      dc.setResolution(resolution);
    }

    return dc.setData(data);
  }

}
