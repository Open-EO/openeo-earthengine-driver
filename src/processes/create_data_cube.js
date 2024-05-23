import GeeProcess from '../processgraph/process.js';
import DataCube from '../datacube/datacube.js';

export default class create_cube extends GeeProcess {

  executeSync(node) {
    const ee = node.ee;
    const dc = new DataCube(ee);
    return dc.setData(null);
  }

}
