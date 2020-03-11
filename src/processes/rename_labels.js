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

        if (!dc.hasDimension(dimensionName)) {
            throw new Errors.ProcessArgumentInvalid({
                process: this.spec.id,
                argument: 'dimension',
                reason: 'Dimension "' + dimension + '" does not exist.'
            });
        }

        // ToDo: only bands is currently supported
        var dimension = dc.getDimension(dimensionName);
        if (dimension.type !== "bands") {
            throw new Errors.ProcessArgumentInvalid({
                process: this.spec.id,
                argument: 'dimension',
                reason: 'Only dimension "bands" is currently supported.'
            });
        }

        var oldLabels;  // array for storing the old label names given by the user
        var allOldLabels;  // array for storing the old existing label names
        if (source !== undefined) {
            oldLabels = source;
            allOldLabels = Array.from(dimension.values); // copy is important
        }
        else {
            oldLabels = Array.from(dimension.values); // copy is important
            allOldLabels = Array.from(oldLabels); // copy is important
        }

        if (target.length !== oldLabels.length) {
            throw new Errors.LabelMismatch();
        }


        for (var i = 0; i < oldLabels.length; i++){
            var oldLabel = oldLabels[i];
            var newLabel = target[i];
            if (typeof oldLabel === 'undefined') {  // dimension was previously removed, so the GEE band is named "#"
                oldLabels[i] = "#";
                allOldLabels = Array.from(newLabel);
            }
            else{
                if (oldLabels.includes(newLabel)){
                    throw Errors.LabelExists();
                }
                var labelIdx = allOldLabels.indexOf(oldLabel);
                if (labelIdx === null) {
                    throw new Errors.LabelNotAvailable();
                }
                else {
                    allOldLabels[labelIdx] = newLabel
                }
            }
        }

        dc.imageCollection(ic => ic.map(this.process(oldLabels, target)));
        dc.dimBands().setValues(allOldLabels);

        return dc
    }

};