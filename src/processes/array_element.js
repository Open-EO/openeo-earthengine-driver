const { BaseProcess } = require('@openeo/js-processgraphs');
const Errors = require('../errors');

module.exports = class array_element extends BaseProcess {

    async execute(node) {
        var data = node.getArgument("data");
        var index = node.getArgument("index");
        var label = node.getArgument("label");
        var return_nodata = node.getArgument("return_nodata", false);

        if ((index !== undefined) && (label !== undefined)){
            throw new Errors.ArrayElementParameterMissing();
        }

        if ((index === undefined) && (label === undefined)){
            throw new Errors.ArrayElementParameterConflict();
        }

        if (label !== undefined) {
            // ToDo: check data type of data
            var dimensionName = node.getProcessGraph().parentNode.getArgument("dimension"); // ToDo 1.0: Replace with node.getParent()
            var dc = node.getProcessGraph().parentNode.getArgument("data");  // ToDO: @MM is this properly done?
            var dimension = dc.getDimension(dimensionName);
            var labels = dimension.getValues();
            if (!labels.includes(label)){
                throw new Errors.ArrayElementNotAvailable();
            }
            else{
                // ToDO: only bands is currently supported
                if (dimension.type !== "bands") {
                    throw new Errors.ProcessArgumentInvalid({
                        process: this.spec.id,
                        argument: 'dimension',
                        reason: 'Only dimension "bands" is currently supported.'
                    });
                }
                else{
                    index = labels.indexOf(label);
                }
            }
        }

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

};