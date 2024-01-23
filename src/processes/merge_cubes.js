import GeeProcess from '../processgraph/process.js';

export default class merge_cubes extends GeeProcess {

  executeSync(node) {
    const dc1 = node.getDataCube("cube1");
    const dc2 = node.getDataCube("cube2");
    //const resolver = node.getCallback("overlap_resolver");
    //const context = node.getArgument("context");

    return dc1.merge(dc2);
  }

}
