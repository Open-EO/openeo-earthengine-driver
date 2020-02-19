const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class product extends BaseProcess {

	geeReducer() {
		return 'product';
	}

    //ToDo: ignore_nodata parameter
    async execute(node) {
        return Commons.reduceInCallback(
            node,
            (a,b) => a * b,
            (a,b) => a.multiply(b)
        );
    }
};