const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class mean extends BaseProcess {

    geeReducer() {
        return 'mean';
    }

	async execute(node) {
		throw "Not implemented yet.";
	}

};