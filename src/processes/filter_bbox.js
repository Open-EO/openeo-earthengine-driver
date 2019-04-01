const Utils = require('../utils');
const Errors = require('../errors');
const Process = require('../processgraph/process');

module.exports = class filter_bbox extends Process {

	async execute(node, context) {
		var dc = node.getData("imagery");
		var geom;
		try {
			dc.setSpatialExtent(node.getArgument("extent"));
			geom = dc.getSpatialExtentAsGeeGeometry();
		} catch (e) {
			return Promise.reject(new Errors.ProcessArgumentInvalid({
				process: this.schema.id,
				argument: 'extent',
				reason: e.message
			}));
		}
		try {
			dc.imageCollection(ic => ic.filterBounds(geom));
			return dc;
		} catch (e) {
			return Promise.reject(new Errors.EarthEngineError(e, {process: this.schema.id}));
		}
	}

};