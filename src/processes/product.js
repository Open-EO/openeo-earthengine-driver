const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class product extends BaseProcess {

    //ToDo: ignore_nodata parameter
    async execute(node) {
        return Commons.reduceBinaryInCallback(
            node,
            (a,b) => a * b,
            (a,b) => a.multiply(b)
        );
    }
};