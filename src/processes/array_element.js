const { BaseProcess } = require('@openeo/js-processgraphs');
const Errors = require('../errors');

module.exports = class array_element extends BaseProcess {

    async execute(node) {
        var data = node.getArgument("data");
        var index = node.getArgument("index", null);
        var label = node.getArgument("label", null);
        var return_nodata = node.getArgument("return_nodata", false);

        if (index !== null && label !== null){
            throw new Errors.ArrayElementParameterConflict();
        }

        if (index === null && label === null){
            throw new Errors.ArrayElementParameterMissing();
        }

        let parentNode = node.getParent();
        if (label !== null && parentNode) {
            // ToDo: check data type of data
            var dimensionName = parentNode.getArgument("dimension");
            var dc = parentNode.getArgument("data");
            var dimension = dc.getDimension(dimensionName);
            var labels = dimension.getValues();
            if (!labels.includes(label)){
                throw new Errors.ArrayElementNotAvailable();
            }
            else{
                // ToDo: only bands is currently supported
                if (dimension.type !== "bands") {
                    throw new Errors.ProcessArgumentInvalid({
                        process: this.id,
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