const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class median extends BaseProcess {

    geeReducer() {
        return 'median';
    }

	async execute(node) {
		throw "Not implemented yet.";
	}

};