const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class log extends BaseProcess {

    async execute(node) {
        var base = node.getArgument('base');
        return Commons.applyInCallback(
            node,
            image => {
                switch(base) {
                    case 10:
                        return image.log10();
                    default:
                        return image.log().divide(ee.Image(base).log());
                }
            },
            x => {
                switch(base) {
                    case 10:
                        return Math.log10(x);
                    case 2:
                        return Math.log2(x);
                    default:
                        return Math.log(x) / Math.log(base)
                }
        );
    }

};