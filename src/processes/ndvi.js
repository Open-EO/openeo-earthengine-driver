const Process = require('../processgraph/process');
const normalized_difference = require('./normalized_difference');
const filter_bands = require('./filter_bands');


// TODO: bands are currently hard-coded
module.exports = class ndvi extends Process {

    async execute(node, context) {
        var name = node.getArgument("name", "normalized_difference");
        var dc1 = node.getData("data");
        var dc2 = node.getData("data");

        // filter bands
        var filterBands = new filter_bands();
        var dc_nir = filterBands.process(dc1, ['B8']);
        var dc_red = filterBands.process(dc2, ['B4']);


        // apply normalised difference
        var normalizedDifference = new normalized_difference();
        return normalizedDifference.process(dc_nir, dc_red, name);
    }

};