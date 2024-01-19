import { BaseProcess } from '@openeo/js-processgraphs';
import DataCube from '../processgraph/datacube.js';

export default class create_raster_cube extends BaseProcess {

  async execute(node) {
    const dc = new DataCube(node.ee);
    dc.setLogger(node.getLogger());
    return dc;
  }

}
