const Dimension = require('./dimension');
const Utils = require('../utils');
const proj4 = require('proj4');

module.exports = class DataCube {

	constructor(sourceDataCube = null) {
		this.data = null;
		this.dimensions = {};
		this.output = {
			format: null,
			parameters: {}
		};

		if (sourceDataCube instanceof DataCube) {
			this.data = sourceDataCube.data;
			this.output = Object.assign({}, sourceDataCube.output);
			for(var i in sourceDataCube.dimensions) {
				this.dimensions[i] = new Dimension(sourceDataCube.dimensions[i]);
			}
		}
	}

	getData() {
		return this.data;
	}

	setData(data) {
		this.data = data;
	}

	image(callback = null) {
		if (this.data instanceof ee.Image) {
			// No op
		}
		else if (this.data instanceof ee.ComputedObject) {
			// ToDo: Send warning via subscriptions
			if (global.server.serverContext.debug) {
				console.warn("Casting to Image might be unintentional.");
			}
			this.data = ee.Image(this.data);
		}
		else if (this.data instanceof ee.ImageCollection) {
			// ToDo: Send warning via subscriptions
			if (global.server.serverContext.debug) {
				console.warn("Compositing the image collection to a single image.");
			}
			this.data = this.data.mosaic();
		}
		else {
			throw "Can't convert to image.";
		}
		if (callback) {
			this.data = callback(this.data);
		}
		return this.data;
	}
	
	imageCollection(callback = null) {
		if (this.data instanceof ee.ImageCollection) {
			// No op
		}
		else if (this.data instanceof ee.Image || this.data instanceof ee.ComputedObject) {
			this.data = ee.ImageCollection(this.data);
		}
		else {
			throw "Can't convert to image collection.";
		}
		if (callback) {
			this.data = callback(this.data);
		}
		return this.data;
	}

	findSingleDimension(type, axis = null) {
		var filter;
		var label = "type '" + type + "'";
		if (axis) {
			filter = dim => dim.type == type && dim.axis == 'x';
			label += " with axis '" + axis + "'";
		}
		else {
			filter = dim => dim.type == type;
		}
		var dims = Object.values(this.dimensions).filter(filter);
		if (dims.length > 1) {
			throw "Multiple dimensions matching "+label+" found. Should be only one.";
		}
		else if (dims.length == 0) {
			throw "No dimension of "+label+" found.";
		}
		return dims[0];
	}

	dimX() {
		return this.findSingleDimension('spatial', 'x');
	}

	dimY() {
		return this.findSingleDimension('spatial', 'y');
	}

	dimZ() {
		return this.findSingleDimension('spatial', 'z');
	}

	dimsZ() {
		return Object.values(this.dimensions).filter(dim => dim.type == 'spatial' && dim.axis == 'z');
	}

	dimT() {
		return this.findSingleDimension('temporal');
	}

	dimsT() {
		return Object.values(this.dimensions).filter(dim => dim.type == 'temporal');
	}

	dimBands() {
		return this.findSingleDimension('bands');
	}

	setSpatialExtent(extent) {
		this.dimX().setExtent(extent.west, extent.east);
		this.dimY().setExtent(extent.south, extent.north);
		if (extent.base && extent.height) {
			this.dimZ().setExtent(extent.base, extent.height);
		}
	}

	setSpatialExtentFromGeometry(geometry) { // GeoJSON geometry
		var bbox = Utils.geoJsonBbox(geometry);
		var hasZ = bbox.length > 4;
		var proj = proj4('WGS84', this.getCrs());
		var p1 = proj.forward([bbox[0], bbox[1]]);
		var p2 = proj.forward([bbox[hasZ ? 3 : 2], bbox[hasZ ? 4 : 3]]);
		this.dimX().setExtent(p1[0], p2[0]);
		this.dimY().setExtent(p1[1], p2[1]);
		if (hasZ) {
			this.dimZ().setExtent(bbox[2], bbox[5]);
		}
	}

	getSpatialExtent() {
		var x = this.dimX();
		var y = this.dimY();

		return {
			west: x.min(),
			east: x.max(),
			south: y.min(),
			north: y.max()
		};
	}

	getSpatialExtentAsGeeGeometry() {
		var x = this.dimX();
		var y = this.dimY();
		if (x.crs() != y.crs()) {
			throw "Spatial dimensions for x and y must not differ.";
		}
		return ee.Geometry.Rectangle([x.min(), y.min(), x.max(), y.max()], x.crs());
	}

	getTemporalExtent() {
		return this.dimT();
	}

	getBands() {
		return this.dimBands().getValues();
	}

	getCrs() {
		var x = this.dimX();
		var y = this.dimY();

		if (x.crs() != y.crs()) {
			throw "Spatial dimensions for x and y must not differ.";
		}

		return x.crs();
	}

	setCrs(refSys) {
		this.dimX().setReferenceSystem(refSys);
		this.dimY().setReferenceSystem(refSys);
	}

	setReferenceSystem(dimName, refSys) {
		this.getDimension(dimName).setReferenceSystem(refSys);
	}

	getResolution(dimName) {
		return this.getDimension(dimName).getResolution();
	}

	setResolution(dimName, resolution) {
		this.getDimension(dimName).setResolution(resolution);
	}

	hasDimension(name) {
		return (this.dimensions[name] instanceof Dimension);
	}

	getDimension(name) {
		if (this.dimensions[name] instanceof Dimension) {
			return this.dimensions[name];
		}
		else {
			throw "Dimension '" + name + "' does not exist.";
		}
	}

	getDimensionNames() {
		return Object.keys(this.dimensions);
	}

	addDimension(name, type, axis = null) {
		if (this.dimensions[name] instanceof Dimension) {
			throw "Dimension '" + name + "' already exists.";
		}
		this.dimensions[name] = new Dimension({
			type: type,
			axis: axis
		});
	}

	setDimensionsFromSTAC(dimensions) {
		this.dimensions = [];
		for (var name in dimensions) {
			this.dimensions[name] = new Dimension(dimensions[name]);
		}
	}

	dropDimension(name) {
		delete this.dimensions[name];
	}

	setOutputFormat(format, parameters = {}) {
		this.output = {
			format: format,
			parameters: parameters
		};
	}

	getOutputFormat() {
		return this.output.format;
	}

	getOutputFormatParameters() {
		return this.output.parameters;
	}

};