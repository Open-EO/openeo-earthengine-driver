import { BaseProcess } from '@openeo/js-processgraphs';

export default class e extends BaseProcess {

  async execute(node) {
    const dc = node.getDataCube('data');
    dc.setData(Math.E);
    return dc;
  }
}
