import GeeProcess from '../processgraph/process.js';

export default class merge_cubes extends GeeProcess {

  async executeSync(node) {
    const ee = node.ee;
    const dc1 = node.getDataCubeWithEE("cube1");
    const dc2 = node.getDataCubeWithEE("cube2");
    const resolver = node.getCallback("overlap_resolver");
    const context = node.getArgument("context");

    if (!dc1.hasXY()) {
      this.invalidArgument("data1", "Datacube must have spatial dimensions.");
    }
    if (!dc2.hasXY()) {
      this.invalidArgument("data2", "Datacube must have spatial dimensions.");
    }

    const data1 = dc1.getData();
    const data2 = dc2.getData();
    let merged = null;
    let dimension = null;
    if (data1 instanceof ee.ImageCollection) {
      if (data2 instanceof ee.ImageCollection) {
        merged = data1.merge(data2);
        dimension = "bands";
      }
      else if (data2 instanceof ee.Image) {
        merged = data1.merge(ee.ImageCollection(data2));
        dimension = "t";
      }
      else {
        this.invalidArgument("data2", "Datacube cannot be merged.");
      }
    }
    else if (data1 instanceof ee.Image) {
      if (data2 instanceof ee.ImageCollection) {
        merged = data2.merge(ee.ImageCollection(data1));
        dimension = "bands";
      }
      else if (data2 instanceof ee.Image) {
        merged = ee.ImageCollection([data1, data2]);
        dimension = "t";
      }
      else {
        this.invalidArgument("data2", "Datacube cannot be merged.");
      }
    }
    else {
      this.invalidArgument("data1", "Datacube cannot be merged.");
    }

    if (resolver) {
      merged = await resolver.execute({
        data: merged,
        context,
        executionContext: {
          type: "reducer",
          parameter: "dimension",
          dimension
        }
      });
    }

    dc1.setData(merged);
    if (dc1.hasT() && dc2.hasT()) {
      dc1.dimT().mergeDimensions(dc2.dimT());
    }
    else if (dc1.hasBands() && dc2.hasBands()) {
      dc1.dimBands().mergeDimensions(dc2.dimBands());
    }
    // todo: add single labels

		return dc1;
  }

}
