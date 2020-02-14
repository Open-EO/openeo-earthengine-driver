const { BaseProcess } = require('@openeo/js-processgraphs');
const Errors = require('../errors');

module.exports = class array_element extends BaseProcess {

    async execute(node) {
        var data = node.getArgument("data");
        var index = node.getArgument("index");
        var label = node.getArgument("label");
        var return_nodata = node.getArgument("return_nodata", false);

        if (index != null && label != null){
            throw new Errors.ArrayElementParameterMissing();
        }

        if (index == null && label == null){
            throw new Errors.ArrayElementParameterConflict();
        }

        if (label != null) {
            if(Array.isArray(data)){
                throw new Errors.ProcessArgumentInvalid({
                    process: this.schema.id,
                    argument: 'data',
                    reason: 'A label was specified, but data is an array, not a data cube.'
                });
            }
            var dimension = node.getProcessGraph().parentNode.getArgument("dimension"); // ToDo 1.0: Replace with node.getParent()
            var labels = data.getDimension(dimension).getValues();
            if (!labels.includes(label)){
                throw new Errors.ArrayElementNotAvailable();
            }
            else{
                // ToDO: only bands is currently supported
                if (dimension !== "bands") {
                    throw new Errors.ProcessArgumentInvalid({
                        process: this.schema.id,
                        argument: 'dimension',
                        reason: 'Only dimension "bands" is currently supported.'
                    });
                }
                else{
                    // ToDo; should filter_bands be called here?
                    return data.imageCollection(ic => ic.select([label]));
                }
            }
        }
        else{
            if (Array.isArray(data) && typeof data[index] !== 'undefined') {
                return data[index];
            }
            else if (return_nodata) {
                return null;
            }
            else {
                throw new Errors.ArrayElementNotAvailable();
            }
        }
    }

};