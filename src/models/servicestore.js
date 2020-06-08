const Utils = require('../utils');

module.exports = class ServiceStore {

	constructor() {
		this.db = Utils.loadDB('services');
		this.editableFields = ['title', 'description', 'process', 'enabled', 'configuration', 'plan', 'budget'];
	}

	isFieldEditable(name) {
		return this.editableFields.includes(name);
	}

	database() {
		return this.db;
	}

	tile2long(x, z) {
		return (x / Math.pow(2,z) * 360 - 180);
	}

	tile2lat(y, z) {
		var n = Math.PI - (2*Math.PI*y) / Math.pow(2,z);
		return ((180 / Math.PI) * Math.atan( 0.5*(Math.exp(n)-Math.exp(-n)) ));
	}

	calculateXYZRect(x, y, z) {
		x = new Number(x);
		y = new Number(y);
		z = new Number(z);

		// Calculate tile bounds
		// see: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
		var nw_lng = this.tile2long(x, z);
		var nw_lat = this.tile2lat(y, z);
		var se_lng  = this.tile2long(x+1, z);
		var se_lat = this.tile2lat(y+1, z);
		var xMin = Math.min(nw_lng, se_lng);
		var xMax = Math.max(nw_lng, se_lng);
		var yMin = Math.min(nw_lat, se_lat);
		var yMax = Math.max(nw_lat, se_lat);

		return {
			west: xMin,
			east: xMax,
			south: yMin,
			north: yMax,
			crs: 'EPSG:4326'
		};
	}

};