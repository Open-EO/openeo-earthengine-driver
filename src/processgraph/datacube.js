const Dimension = require('./dimension');
const Utils = require('../utils');
const proj4 = require('proj4');

module.exports = class DataCube {

	constructor(sourceDataCube = null, data = undefined) {
		// Don't set this data directly, always use setData() to reset the type cache!
		this.data = data;
		// Cache the data type for less overhead, especially for ee.ComputedObject
		this.type = null;
		this.dimensions = {};
		this.output = {
			format: null,
			parameters: {}
		};

		if (sourceDataCube instanceof DataCube) {
			if (data === undefined) {
				this.data = sourceDataCube.data;
				this.type = sourceDataCube.type;
			}
			this.output = Object.assign({}, sourceDataCube.output);
			for(var i in sourceDataCube.dimensions) {
				this.dimensions[i] = new Dimension(this, sourceDataCube.dimensions[i]);
			}
		}
	}

	getData() {
		return this.data;
	}

	setData(data) {
		this.data = data;
		// Reset type cache
		this.type = null;
	}

	static getDataType(data) {
		if (data instanceof ee.Image) {
			return "eeImage";
		}
		else if (data instanceof ee.ImageCollection) {
			return "eeImageCollection";
		}
		else if(data instanceof ee.Array) {
			return "eeArray";
		}
		// Check for ComputedObject only after checking all the other EE types above
		else if (data instanceof ee.ComputedObject) {
			console.log("Calling slow function getInfo(); Try to avoid this.");
			// ToDo: This is slow and needs to be replaced so that it uses a callback as parameter for getInfo() and the method will be async.
			var info = data.getInfo();
			// Only works for Image and ImageCollection and maybe some other types, but not for Array for example.
			// Arrays, numbers and all other scalars should be handled with the native JS code below.
			if (Utils.isObject(info) && typeof info.type === 'string') {
				return "ee" + info.type;
			}
		}

		// Check for native JS types
		if (Array.isArray(data)) {
			return "array";
		}
		else if (data === null) {
			return "null";
		}
		else if (typeof data === 'object' && data.constructor && typeof data.constructor.name === 'string') {
			return data.constructor.name; // ToDo: This may conflict with other types, e.g. Image or ImageCollection
		}
		else {
			return typeof data;
		}
	}

	objectType() {
		if (this.type === null) {
			this.type = DataCube.getDataType(this.data);
		}
		return this.type;
	}

	isNumber() {
		return this.objectType() === 'number';
	}

	isNull() {
		return this.objectType() === 'null';
	}

	isImage() {
		return this.objectType() === "eeImage";
	}

	isEarthEngineArray() {
		return this.objectType() === "eeArray";
	}

	isImageCollection() {
		return this.objectType() === "eeImageCollection";
	}

	image(callback = null, ...args) {
		if (this.isImage()){
			// no operation
		}
		else if (this.isImageCollection()) {
			// ToDo: Write warning to user log
			if (global.server.serverContext.debug) {
				console.log("Compositing the image collection to a single image.");
			}
			this.setData(this.data.mosaic());
		}
		else if (this.isEarthEngineArray()) {
			this.setData(ee.Image(this.data));
		}
		else {
			throw new Error("Can't convert " + this.objectType() + " to image.");
		}
		if (callback) {
			this.setData(callback(this.data, ...args));
		}
		return this.data;
	}
	
	imageCollection(callback = null, ...args) {
		if (this.isImageCollection()){
			// no operation
		}
		else if (this.isImage()) {
			this.setData(ee.ImageCollection(this.data));
		}
		else if (this.isEarthEngineArray()) {
			this.setData(ee.ImageCollection(ee.Image(this.data)));
		}
		else {
			throw new Error("Can't convert " + this.objectType() + " to image collection.");
		}
		if (callback) {
			this.setData(callback(this.data, ...args));
		}
		return this.data;
	}
	
	array(callback = null, ...args) {
		if (this.isEarthEngineArray()) {
			// no operation
		}
		else if (this.isImage()) {
			this.setData(this.data.toArray());
		}
		else {
			throw new Error("Can't convert " + this.objectType() + " to an EE array.");
		}
		if (callback) {
			this.setData(callback(this.data, ...args));
		}
		return this.data;
	}

	findSingleDimension(type, axis = null) {
		var filter;
		var label = "type '" + type + "'";
		if (axis) {
			filter = dim => dim.type == type && dim.axis == axis;
			label += " with axis '" + axis + "'";
		}
		else {
			filter = dim => dim.type == type;
		}
		var dims = Object.values(this.dimensions).filter(filter);
		if (dims.length > 1) {
			throw new Error("Multiple dimensions matching "+label+" found. Should be only one.");
		}
		else if (dims.length == 0) {
			throw new Error("No dimension of "+label+" found.");
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

	dim(name) {
		if (name in this.dimensions) {
			return this.dimensions[name];
		}
		else {
			return null;
		}
	}

	setSpatialExtent(extent) {
		var crs = extent.crs > 0 ? 'EPSG:' + extent.crs : 'EPSG:4326';
		var proj = proj4(crs, this.getCrs());
		var p1 = proj.forward([extent.west, extent.south]);
		var p2 = proj.forward([extent.east, extent.north]);
		this.dimX().setExtent(p1[0], p2[0]);
		this.dimY().setExtent(p1[1], p2[1]);
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
			north: y.max(),
			crs: this.getCrs()
		};
	}

	getTemporalExtent() {
		return this.dimT();
	}

	// returns: array
	getEarthEngineBands() {
		var bands = this.getBands();
		if (bands.length === 0) {
			bands.push("#");
		}
		return bands;
	}

	// returns: array
	getBands() {
		try {
			return this.dimBands().getValues();
		} catch(e) {
			return [];
		}
	}

	setBands(bands) {
		this.dimBands().setValues(bands);
	}

	getCrs() {
		var x = this.dimX();
		var y = this.dimY();

		if (x.crs() != y.crs()) {
			throw new Error("Spatial dimensions for x and y must not differ.");
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
			throw new Error("Dimension '" + name + "' does not exist.");
		}
	}

	getDimensionNames() {
		return Object.keys(this.dimensions);
	}

	addDimension(name, type, axis = null) {
		if (this.dimensions[name] instanceof Dimension) {
			throw new Error("Dimension '" + name + "' already exists.");
		}
		var dimension = new Dimension(this, {
			type: type,
			axis: axis
		});
		this.dimensions[name] = dimension;
		return dimension;
	}

	setDimensionsFromSTAC(dimensions) {
		this.dimensions = [];
		for (var name in dimensions) {
			this.dimensions[name] = new Dimension(this, dimensions[name]);
		}
	}

	renameDimension(oldName, newName) {
		this.dimensions[newName] = this.dimensions[oldName];
		delete this.dimensions[oldName];
	}

	dropDimension(name) {
		if (name instanceof Dimension) {
			for(var key in this.dimensions) {
				if (this.dimensions[key] === name) {
					delete this.dimensions[key];
					return;
				}
			}
		}
		else {
			delete this.dimensions[name];
		}
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
		if (typeof this.output.parameters !== 'object' || this.output.parameters === null || Array.isArray(this.output.parameters)) {
			return {};
		}
		return this.output.parameters;
	}

	// ToDO: revise this functions for other/more complex use cases
	stackCollection(collection) {
		// create an initial image.
		var first = ee.Image(collection.first()).select([]);
		// write a function that appends a band to an image.
		var appendBands = function(image, previous) {
			return ee.Image(previous).addBands(image);
		};
		return ee.ImageCollection([collection.iterate(appendBands, first)]);
	}

	// ToDO: add code for overlap resolver and inplace
	merge(otherDataCube, overlapResolver=null, inplace=true){
		if (otherDataCube instanceof DataCube) {
			if (this.isImageCollection() && otherDataCube.isImageCollection()) {
				this.setData(this.stackCollection(this.data.merge(otherDataCube.data)));
			}
			this.output = Object.assign(this.output, otherDataCube.output);
			for(var i in otherDataCube.dimensions) {
				if (!(i in this.dimensions)){
					this.dimensions[i] = new Dimension(this, otherDataCube.dimensions[i]);
				}
				else {
					// retrieve values and extents
					var this_dim_vals = this.dimensions[i].values;
					var other_dim_vals = otherDataCube.dimensions[i].values;
					var this_extent = this.dimensions[i].extent;
					var other_extent = otherDataCube.dimensions[i].extent;

					// merge extents
					var min_extent = [this_extent[0], other_extent[0]];
					var max_extent = [this_extent[1], other_extent[1]];
					var merged_extent = [Math.max(...min_extent), Math.min(...max_extent)];


					// check if there are duplicate values
					this_dim_vals.forEach(function (element) {
						if (other_dim_vals.includes(element)){
							throw new Error("Label '" + element + "' exists already. Overlap cannot be resolved");
						}
					});

					// set values and extent
					this.dimensions[i].setValues(this_dim_vals.concat(other_dim_vals));
					this.dimensions[i].extent = merged_extent;
				}
			}
		}
		else {
			throw new Error('The given argument is not a data cube.')
		}

		return this
	}
};