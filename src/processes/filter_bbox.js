const Utils = require('../utils');
const Errors = require('../errors');
const Process = require('../processgraph/process');

module.exports = class filter_bbox extends Process {

	execute(args, context) {
		var geom;
		try {
			context.setBoundinBox(args.extent);
			geom = context.getSpatialExtent();
		} catch (e) {
			return Promise.reject(new Errors.ProcessArgumentInvalid({
				process: this.schema.id,
				argument: 'extent',
				reason: e.message
			}));
		}
		try {
			var obj = Utils.toImageCollection(args.imagery).filterBounds(geom);
			return Promise.resolve(obj);
		} catch (e) {
			return Promise.reject(new Errors.EarthEngineError(e, {process: this.schema.id}));
		}
	}

};