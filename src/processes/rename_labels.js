import GeeProcess from '../processgraph/process.js';

export default class rename_labels extends GeeProcess {


  process(oldLabels, newLabels) {
    return function renameBandsInner(image) {
      return image.select(oldLabels).rename(newLabels);
    };
  }

  executeSync(node) {
    const dc = node.getArgument("data");
    const dimensionName = node.getArgument("dimension");
    const target = node.getArgument("target");
    const source = node.getArgument("source");

    if (!dc.hasDimension(dimensionName)) {
			throw node.invalidArgument('dimension', `Dimension '${dimensionName}' does not exist.`);
    }

    // ToDo processes: only bands is currently supported
    const dimension = dc.getDimension(dimensionName);
    if (dimension.type !== "bands") {
			throw node.invalidArgument('dimension', `Only dimension "bands" is currently supported.`);
    }
    // ToDo processes: Number values for the labels arguments causes problems
    dc.renameLabels(dimension, target, source);

    return dc;
  }

}
