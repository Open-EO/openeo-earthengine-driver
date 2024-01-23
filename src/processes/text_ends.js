import GeeProcess from '../processgraph/process.js';

export default class text_ends extends GeeProcess {

  executeSync(node) {
    let data = node.getArgument('data');
    let pattern = node.getArgument('pattern');
    const case_sensitive = node.getArgument('case_sensitive');
    if (!case_sensitive) {
      data = data.toLowerCase();
      pattern = pattern.toLowerCase();
    }

    const dc = node.getDataCube('data');
    dc.setData(data.endsWith(pattern));
    return dc;
  }

}
