const { BaseProcess } = require('@openeo/js-processgraphs');
const Errors = require('../errors');

module.exports = class drop_dimension extends BaseProcess {

    async execute(node) {

        var dc = node.getArgument('data');
        var dimensionName = node.getArgument('name');
        var dimension;

        if (dc.hasDimension(dimensionName) === false) {
            throw new Errors.DimensionNotAvailable({
                process: this.spec.id,
                argument: 'source',
                reason: 'A dimension with the specified name does not exist.'
            });
        }

        dimension = dc.getDimension(dimensionName);

        if (dimension.values.length > 1){
            throw new Errors.DimensionLabelCountMismatch({
                process: this.spec.id,
                argument: 'source',
                reason: 'The number of dimension labels exceeds one, which requires a reducer.'
            });
        }

        dc.dropDimension(dimensionName);
        return dc;
    }

};