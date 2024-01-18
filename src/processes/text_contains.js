import { BaseProcess } from '@openeo/js-processgraphs';

export default class text_contains extends BaseProcess {

  async execute(node) {
    let data = node.getArgument('data');
    let pattern = node.getArgument('pattern');
    const case_sensitive = node.getArgument('case_sensitive');
    if (!case_sensitive) {
      data = data.toLowerCase();
      pattern = pattern.toLowerCase();
    }

    const dc = node.getDataCube('data');
    dc.setData(data.includes(pattern));
    return dc;
  }

}
