const { BaseProcess } = require('@openeo/js-processgraphs');
const Errors = require('../errors');

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
        var dimension = dc.getDimension(dimensionName);

        if (!dc.hasDimension(dimensionName)) {
            throw new Errors.ProcessArgumentInvalid({
                process: this.spec.id,
                argument: 'dimension',
                reason: 'Dimension "' + dimension + '" does not exist.'
            });
        }

        // ToDO: only bands is currently supported
        if (dimension.type !== "bands") {
            throw new Errors.ProcessArgumentInvalid({
                process: this.spec.id,
                argument: 'dimension',
                reason: 'Only dimension "bands" is currently supported.'
            });
        }

        var oldLabels = null;
        var allOldLabels = null;
        if (source != null) {
            oldLabels = source;
            allOldLabels = dimension.getValues();
        }
        else {
            oldLabels = dimension.getValues();
            allOldLabels = oldLabels;
        }

        if (target.length !== oldLabels.length) {
            throw new Errors.LabelMismatch();
        }

        for (var i = 1; i < oldLabels.length; i++){
            var oldLabel = oldLabels[i];
            var newLabel = target[i];
            if (oldLabels.includes(newLabel)){
                throw Errors.LabelExists();
            }
            var labelIdx = allOldLabels.indexOf(oldLabel);
            if(~labelIdx){
                throw Errors.LabelNotAvailable();
            }
            else{
                allOldLabels[labelIdx] = newLabel
            }
        }

        dc.imageCollection(ic => ic.map(this.process(oldLabels, target)));
        dc.dimBands().setValues(allOldLabels);

        return dc
    }

};