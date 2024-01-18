import { BaseProcess } from '@openeo/js-processgraphs';

export default class dimension_labels extends BaseProcess {

  async execute(node) {
    const dc = node.getArgument('data');
    const dimensionName = node.getArgument('dimension');
    const dimension = dc.getDimension(dimensionName);

    return Array.from(dimension.values);
  }

}
