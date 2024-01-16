const { BaseProcess } = require('@openeo/js-processgraphs');
const Errors = require('../utils/errors');

module.exports = class rename_labels extends BaseProcess {


    process(oldLabels, newLabels){
        return function renameBandsInner(image) {
            return image.select(oldLabels).rename(newLabels);
        };
    }

    async execute(node) {
        var dc = node.getArgument("data");
        var dimensionName = node.getArgument("dimension");
        var target = node.getArgument("target");
        var source = node.getArgument("source");

        if (!dc.hasDimension(dimensionName)) {
            throw new Errors.ProcessArgumentInvalid({
                process: this.id,
                argument: 'dimension',
                reason: 'Dimension "' + dimension + '" does not exist.'
            });
        }

        // ToDo: only bands is currently supported
        var dimension = dc.getDimension(dimensionName);
        if (dimension.type !== "bands") {
            throw new Errors.ProcessArgumentInvalid({
                process: this.id,
                argument: 'dimension',
                reason: 'Only dimension "bands" is currently supported.'
            });
        }
        // TODO Number values for the labels arguments causes problems
        dc.renameLabels(dimension, target, source);

        return dc;
    }

};