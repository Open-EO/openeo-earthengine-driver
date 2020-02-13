const { BaseProcess } = require('@openeo/js-processgraphs');
const Errors = require('../errors');

module.exports = class array_element extends BaseProcess {

    async execute(node) {
        var data = node.getArgument("data");
        var index = node.getArgument("index");
        var return_nodata = node.getArgument("return_nodata", false);

        if (Array.isArray(data) && typeof data[index] !== 'undefined') {
            return data[index];
        }
        else if (return_nodata) {
            return null;
        }
        else {
            throw new Errors.IndexOutOfBounds();
        }
    }

};