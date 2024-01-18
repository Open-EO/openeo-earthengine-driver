import { BaseProcess } from '@openeo/js-processgraphs';

export default class pi extends BaseProcess {

  async execute(node) {
    let dc = node.getDataCube('data');
    dc.setData(Math.PI);
    return dc;
  }
}
