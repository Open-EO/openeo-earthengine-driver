const Process = require('../processgraph/process');

// TODO: assumes bands have been labelled before
// TODO: complete implementation
module.exports = class ndvi extends Process {

    async execute(node, context) {
        var name = node.getArgument("name", "normalized_difference");
        var image_process = function(image){
            var red = image.select('red');
            var nir = image.select('nir');
            var ndvi = nir.subtract(red).divide(nir.add(red)).rename(name);
            return image.addBands(ndvi).select(name);
        };
        var dc = Commons.applyInCallback(node, 'data', image_process, null);
        dc.setBands([name]);
        return dc;
    }

}