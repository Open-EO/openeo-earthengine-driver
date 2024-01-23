import GeeProcess from '../processgraph/process.js';

export default class dimension_labels extends GeeProcess {

  executeSync(node) {
    const dc = node.getArgument('data');
    const dimensionName = node.getArgument('dimension');
    const dimension = dc.getDimension(dimensionName);

    return Array.from(dimension.values);
  }

}
