const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class mask extends BaseProcess {

    process(mask){
        return function maskDataCube(image) {
            var m = mask.filterDate(image.date()).first();
            return image.updateMask(m);
        };
    }

    async execute(node) {
        var data = node.getArgument("data");
        var mask = node.getArgument("mask");

        if (!data.isImageCollection() || !mask.isImageCollection()) {
            throw new Error("Data and/or mask argument is no datacube.");
        }

        if (!data.isImageCollection() || !mask.isImageCollection()) {
            throw new Error("data and/or mask property is no datacube.");
        }

        return data.imageCollection(ic => ic.map(this.process(mask)));
    }

};