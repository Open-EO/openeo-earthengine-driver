const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class min extends BaseProcess {

    geeReducer() {
        return 'min';
    }

	async execute(node) {
		return Commons.reduceInCallback(
			node,
			(a,b) => Math.min(a,b),
			(a,b) => a.min(b)
		);
	}

};