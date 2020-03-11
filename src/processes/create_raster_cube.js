const { BaseProcess } = require('@openeo/js-processgraphs');
const DataCube = require('../processgraph/datacube');

module.exports = class create_raster_cube extends BaseProcess {

    async execute(node) {
        return new DataCube();
    }

};