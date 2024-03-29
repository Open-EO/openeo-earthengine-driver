import GeeProcess from '../processgraph/process.js';
import DataCube from '../processgraph/datacube.js';

export default class create_cube extends GeeProcess {

  executeSync(node) {
    const dc = new DataCube(node.ee);
    dc.setLogger(node.getLogger());
    dc.setData(node.ee.Image());
    return dc;
  }

}
