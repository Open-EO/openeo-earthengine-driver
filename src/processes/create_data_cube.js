import GeeProcess from '../processgraph/process.js';
import DataCube from '../processgraph/datacube.js';

export default class create_cube extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const dc = new DataCube(ee);
    dc.setData(null);
    return dc;
  }

}
