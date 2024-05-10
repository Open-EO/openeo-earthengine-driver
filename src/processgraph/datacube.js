import Dimension from './dimension.js';
import Utils from '../utils/utils.js';

export default class DataCube {

	constructor(ee, data = undefined) {
		this.ee = ee;
		// Cache the data type for less overhead, especially for ee.ComputedObject
		this.dimensions = {};
		this.output = {
			format: null,
			parameters: {}
		};

		// Don't set this data directly, always use setData() to reset the type cache!
		if (data instanceof DataCube) {
			this.data = data.data;
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

	getData() {
		return this.data;
	}

	setData(data) {
		this.data = data;
		return this;
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

	dimT() {
		return this.findSingleDimension('temporal');
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
				// this.logger.warn("Bounding Box has been reduced to the maximum bounding box supported by the target CRS.");
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

	setDimensionsFromSTAC(dimensions) {
		this.dimensions = {};
		for (const name in dimensions) {
			this.dimensions[name] = new Dimension(this, dimensions[name], name);
		}
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

	renameDimension(oldName, newName) {
		this.dimensions[newName] = this.dimensions[oldName];
		delete this.dimensions[oldName];
		this.dimensions[newName].setName(newName);
		return this;
	}

	dropDimension(name) {
		delete this.dimensions[name];
	}

	// addDimension(name, type, axis = null) {
	// 	if (this.dimensions[name] instanceof Dimension) {
	// 		throw new Error("Dimension '" + name + "' already exists.");
	// 	}
	// 	const dimension = new Dimension(this, {
	// 		type: type,
	// 		axis: axis
	// 	});
	// 	this.dimensions[name] = dimension;
	// 	return dimension;
	// }

	// renameLabels(dimension, target, source) {
	// 	let oldLabels; // array for storing the old label names given by the user
	// 	let allOldLabels; // array for storing the old existing label names
	// 	if (source !== undefined) {
	// 		oldLabels = source;
	// 		allOldLabels = Array.from(dimension.values); // copy is important
	// 	}
	// 	else {
	// 		oldLabels = Array.from(dimension.values); // copy is important
	// 		allOldLabels = Array.from(oldLabels); // copy is important
	// 	}

	// 	if (target.length !== oldLabels.length) {
	// 		throw new Errors.LabelMismatch();
	// 	}

	// 	for (let i = 0; i < oldLabels.length; i++){
	// 		let oldLabel = oldLabels[i];
	// 		let newLabel = target[i];
	// 		if (typeof oldLabel === 'undefined') { // dimension was previously removed, so the GEE band is named "#"
	// 			oldLabels[i] = "#";
	// 			allOldLabels = Array.from(newLabel);
	// 		}
	// 		else{
	// 			if (oldLabels.includes(newLabel)){
	// 				throw Errors.LabelExists();
	// 			}
	// 			const labelIdx = allOldLabels.indexOf(oldLabel);
	// 			if (labelIdx === null) {
	// 				throw new Errors.LabelNotAvailable();
	// 			}
	// 			else {
	// 				allOldLabels[labelIdx] = newLabel
	// 			}
	// 		}
	// 	}

	// 	this.imageCollection(ic => ic.map(image => image.select(oldLabels).rename(target)));
	// 	this.dimBands().setValues(allOldLabels);
	// }

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

}
