const Process = require('../processgraph/process');
const Errors = require('../errors');

module.exports = class array_element extends Process {

    async execute(node, context) {
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