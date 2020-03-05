const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class arcosh extends BaseProcess {

    async execute(node) {
        return Commons.applyInCallback(
            node,
            image => {
                // Using arcosh formula for calculation (see wikipedia)
                var img_p2 = image.pow(2);
                img_p2 = img_p2.subtract(1);
                img_p2 = img_p2.sqrt();
                var result = image.add(img_p2);
                return result.log();
            },
            x => Math.acosh(x)
        );
    }

};