const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class round extends BaseProcess {

    // ToDo processes: Check whether GEE and JS really follow IEEE 754 rounding behavior
    async execute(node) {
        var p = node.getArgument("p");
        var scaleFactor = p !== null ? 10**p : null;
        return Commons.applyInCallback(
            node,
            image => {
                if (p === null) {
                    return image.round();
                }
                else {
                    return image.multiply(scaleFactor).round().divide(scaleFactor);
                }
            },
            x => {
                if (p === null) {
                    return Math.round(x);
                }
                else {
                    return Math.round(x * scaleFactor) / scaleFactor;
                }
            }
        );
    }

};