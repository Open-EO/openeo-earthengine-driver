import { BaseProcess } from '@openeo/js-processgraphs';

export default class mask extends BaseProcess {

    async execute(node) {
        var data = node.getArgument("data");
        var maskCude = node.getArgument("mask");
        var replacement = node.getArgument("replacement", null);

        if (!data.isImageCollection() || !maskCude.isImageCollection()) {
            throw new Error("Data and/or mask argument is no datacube.");
        }

        if (!data.isImageCollection() || !maskCude.isImageCollection()) {
            throw new Error("data and/or mask property is no datacube.");
        }

        return data.imageCollection(ic => ic.map(function(image) {
            // Get corresponding (first) image from mask by date
            // ToDo processes: there might be multiple, maybe we should warn if this is ambiguous
            var maskImg = maskCude.filterDate(image.date()).first();
            // Mask image / Set no-data
            var maskedImg = image.updateMask(maskImg);
            // Replace no-data with replacement value
            if (replacement !== null) {
                return maskedImg.unmask(replacement);
            }
            else {
                return maskedImg;
            }
        }));
    }

}
