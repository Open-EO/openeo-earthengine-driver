const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class max extends BaseProcess {

    geeReducer() {
        return 'max';
    }

	async execute(node) {
		return Commons.reduceInCallback(
			node,
			(a,b) => Math.max(a,b),
			(a,b) => a.max(b)
		);
	}

};