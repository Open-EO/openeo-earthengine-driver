const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class filter_spatial extends BaseProcess {

	async execute(node) {
		return Commons.filterGeoJSON(node.getData("data"), node.getArgument("geometries"), this.spec.id, 'geometries');
	}

};