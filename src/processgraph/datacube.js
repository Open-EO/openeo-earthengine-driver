import Dimension from './dimension.js';
import Utils from '../utils/utils.js';
import Errors from '../utils/errors.js';

export default class DataCube {

	constructor(ee, data = undefined) {
		this.ee = ee;
		// Cache the data type for less overhead, especially for ee.ComputedObject
		this.type = null;
		this.dimensions = {};
		this.output = {
			format: null,
			parameters: {}
		};
		this.col_id = null;
		this.logger = null;

		// Don't set this data directly, always use setData() to reset the type cache!
		if (data instanceof DataCube) {
			this.data = data.data;
			this.type = data.type;
			this.logger = data.logger;
			this.output = Object.assign({}, data.output);
			for(const i in data.dimensions) {
				this.dimensions[i] = new Dimension(this, data.dimensions[i]);
			}
		}
		else {
			this.data = data;
		}
	}

	toJSON() {
		const dimensions = {};
		for(const name in this.dimensions) {
			dimensions[name] = this.dimensions[name].toSTAC();
		}
		return {
			"cube:dimensions": dimensions
		}
	}

	getLogger() {
		return this.logger;
	}

	setLogger(logger) {
		this.logger = logger;
	}

	getData() {
		return this.data;
	}

	setData(data) {
		this.data = data;
		// Reset type cache
		this.type = null;
	}

	getDataType() {
		const ee = this.ee;
		if (this.data instanceof ee.Image) {
			return "eeImage";
		}
		else if (this.data instanceof ee.ImageCollection) {
			return "eeImageCollection";
		}
		else if(this.data instanceof ee.Array) {
			return "eeArray";
		}
		// Check for ComputedObject only after checking all the other EE types above
		else if (this.data instanceof ee.ComputedObject) {
			if (this.logger) {
				this.logger.warn("Calling slow function getInfo(); Try to avoid this.");
			}
			// ToDo perf: This is slow and needs to be replaced so that it uses a callback as parameter for getInfo() and the method will be async.
			const info = this.data.getInfo();
			// Only works for Image and ImageCollection and maybe some other types, but not for Array for example.
			// Arrays, numbers and all other scalars should be handled with the native JS code below.
			if (Utils.isObject(info) && typeof info.type === 'string') {
				return "ee" + info.type;
			}
		}

		// Check for native JS types
		if (Array.isArray(this.data)) {
			return "array";
		}
		else if (this.data === null) {
			return "null";
		}
		else if (typeof data === 'object' && this.data.constructor && typeof this.data.constructor.name === 'string') {
			return this.data.constructor.name; // ToDo processes: This may conflict with other types, e.g. Image or ImageCollection
		}
		else {
			return typeof data;
		}
	}

	objectType() {
		if (this.type === null) {
			this.type = this.getDataType();
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
		const ee = this.ee;
		if (this.isImage()){
			// no operation
		}
		else if (this.isImageCollection()) {
			if (this.logger) {
				this.logger.warn("Compositing the image collection to a single image.");
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
		const ee = this.ee;
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
		let filter;
		let label = "type '" + type + "'";
		if (axis) {
			filter = dim => dim.type === type && dim.axis === axis;
			label += " with axis '" + axis + "'";
		}
		else {
			filter = dim => dim.type === type;
		}
		const dims = Object.values(this.dimensions).filter(filter);
		if (dims.length > 1) {
			throw new Error("Multiple dimensions matching "+label+" found. Should be only one.");
		}
		else if (dims.length === 0) {
			throw new Error("No dimension of "+label+" found.");
		}
		return dims[0];
	}

	hasDimensionsXY() {
		const spatialDimensions = Object.values(this.dimensions).filter(dim => dim.type === 'spatial' && ['x', 'y'].includes(dim.axis));
		return spatialDimensions.length >= 2;
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
		return Object.values(this.dimensions).filter(dim => dim.type === 'spatial' && dim.axis === 'z');
	}

	dimT() {
		return this.findSingleDimension('temporal');
	}

	dimsT() {
		return Object.values(this.dimensions).filter(dim => dim.type === 'temporal');
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

	limitExtentToCrs(extent, newCrs) {
		extent.crs = extent.crs > 0 ? extent.crs : 4326;
		if (extent.crs === newCrs) {
			// CRS doesn't change, skip
			return extent;
		}
		if (extent.crs !== 4326) {
			// Project to 4326 so that we can compare it to the CRS bbox
			extent = Utils.projExtent(extent, 4326);
		}
		// Use only the overlapping part of the bbox specified by the data and the bbox specified by the CRS
		const crsBbox = Utils.getCrsBBox(newCrs);
		if (Array.isArray(crsBbox)) {
			if(this.logger && (crsBbox[1] > extent.west || crsBbox[2] > extent.south || crsBbox[3] < extent.east || crsBbox[0] < extent.north)) {
				this.logger.warn("Bounding Box has been reduced to the maximum bounding box supported by the target CRS.");
			}
			extent.west = Math.max(extent.west, crsBbox[1]);
			extent.south = Math.max(extent.south, crsBbox[2]);
			extent.east = Math.min(extent.east, crsBbox[3]);
			extent.north = Math.min(extent.north, crsBbox[0]);
		}
		if (newCrs !== 4326) {
			// Project to the new CRS
			extent = Utils.projExtent(extent, newCrs);
		}
		return extent;
	}

	setSpatialExtent(extent) {
		extent.crs = extent.crs > 0 ? extent.crs : 4326;
		const toCrs = this.getCrs();
		const p1 = Utils.proj(extent.crs, toCrs, [extent.west, extent.south]);
		const p2 = Utils.proj(extent.crs, toCrs, [extent.east, extent.north]);
		this.dimX().setExtent(p1[0], p2[0]);
		this.dimY().setExtent(p1[1], p2[1]);
		if (Utils.isNumeric(extent.base) && Utils.isNumeric(extent.height)) {
			this.dimZ().setExtent(extent.base, extent.height);
		}
	}

	setSpatialExtentFromGeometry(geometry) { // GeoJSON geometry
		this.setSpatialExtent(Utils.geoJsonBbox(geometry));
	}

	getSpatialExtent() {
		const x = this.dimX();
		const y = this.dimY();
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
		let bands = this.getBands();
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

	getCollectionId() {
		return this.col_id
	}

	setCollectionId(id) {
		this.col_id = id;
	}

	setBands(bands) {
		this.dimBands().setValues(bands);
	}

	getCrs() {
		const x = this.dimX();
		const y = this.dimY();

		if (x.crs() !== y.crs()) {
			throw new Error("Spatial dimensions for x and y must not differ.");
		}

		return x.crs();
	}

	setCrs(refSys) {
		const extent = this.getSpatialExtent();
		this.dimX().setReferenceSystem(refSys);
		this.dimY().setReferenceSystem(refSys);
		this.setSpatialExtent(this.limitExtentToCrs(extent, refSys)); // Update the extent based on the new CRS
	}

	setReferenceSystem(dimName, refSys) {
		const dimension = this.getDimension(dimName);
		if (dimension.type === 'spatial' && ['x', 'y'].includes(dimension.axis)) {
			throw new Error("You need to set spatial reference systems for axes x and y with setCrs().");
		}
		dimension.setReferenceSystem(refSys);
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
		const dimension = new Dimension(this, {
			type: type,
			axis: axis
		});
		this.dimensions[name] = dimension;
		return dimension;
	}

	setDimensionsFromSTAC(dimensions) {
		this.dimensions = [];
		for (const name in dimensions) {
			this.dimensions[name] = new Dimension(this, dimensions[name]);
		}
	}

	renameDimension(oldName, newName) {
		this.dimensions[newName] = this.dimensions[oldName];
		delete this.dimensions[oldName];
	}

	renameLablesInner(oldLabels, newLabels){
		return function renameBandsInner(image) {
			return image.select(oldLabels).rename(newLabels);
		};
	}

	renameLabels(dimension, target, source) {
		let oldLabels; // array for storing the old label names given by the user
		let allOldLabels; // array for storing the old existing label names
		if (source !== undefined) {
			oldLabels = source;
			allOldLabels = Array.from(dimension.values); // copy is important
		}
		else {
			oldLabels = Array.from(dimension.values); // copy is important
			allOldLabels = Array.from(oldLabels); // copy is important
		}

		if (target.length !== oldLabels.length) {
			throw new Errors.LabelMismatch();
		}

		for (let i = 0; i < oldLabels.length; i++){
			let oldLabel = oldLabels[i];
			let newLabel = target[i];
			if (typeof oldLabel === 'undefined') { // dimension was previously removed, so the GEE band is named "#"
				oldLabels[i] = "#";
				allOldLabels = Array.from(newLabel);
			}
			else{
				if (oldLabels.includes(newLabel)){
					throw Errors.LabelExists();
				}
				const labelIdx = allOldLabels.indexOf(oldLabel);
				if (labelIdx === null) {
					throw new Errors.LabelNotAvailable();
				}
				else {
					allOldLabels[labelIdx] = newLabel
				}
			}
		}

		this.imageCollection(ic => ic.map(this.renameLablesInner(oldLabels, target)));
		this.dimBands().setValues(allOldLabels);
	}

	dropDimension(name) {
		if (name instanceof Dimension) {
			for(const key in this.dimensions) {
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

	setOutputFormatParameter(key, value) {
		this.output.parameters[key] = value;
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

	// ToDo processes: revise this functions for other/more complex use cases #64
	stackCollection(collection) {
		const ee = this.ee;
		// create an initial image.
		const first = ee.Image(collection.first()).select([]);
		// write a function that appends a band to an image.
		const appendBands = function(image, previous) {
			return ee.Image(previous).addBands(image);
		};
		return ee.ImageCollection([collection.iterate(appendBands, first)]);
	}

	// ToDO processes: add code for overlap resolver and inplace
	merge(otherDataCube){
		if (otherDataCube instanceof DataCube) {
			if (this.isImageCollection() && otherDataCube.isImageCollection()) {
				this.setData(this.stackCollection(this.data.merge(otherDataCube.data)));
			}
			this.output = Object.assign(this.output, otherDataCube.output);
			for(const i in otherDataCube.dimensions) {
				if (!(i in this.dimensions)){
					this.dimensions[i] = new Dimension(this, otherDataCube.dimensions[i]);
				}
				else {
					// retrieve values and extents
					const this_dim_vals = this.dimensions[i].values;
					const other_dim_vals = otherDataCube.dimensions[i].values;
					const this_extent = this.dimensions[i].extent;
					const other_extent = otherDataCube.dimensions[i].extent;

					// merge extents
					const min_extent = [this_extent[0], other_extent[0]];
					const max_extent = [this_extent[1], other_extent[1]];
					const merged_extent = [Math.max(...min_extent), Math.min(...max_extent)];


					// check if there are duplicate values
					this_dim_vals.forEach(function (element) {
						if (other_dim_vals.includes(element)){
							throw new Errors.OverlapResolverMissing();
							// if (overlapResolver == null){
							// 	throw new Errors.OverlapResolverMissing();
							// }
							// if (!(overlapResolver instanceof ProcessGraph)) {
							// 	throw new Errors.OverlapResolverMissing();
							// }
							//ToDo processes: implement overlap resolver
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
}
