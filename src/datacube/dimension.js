export default class Dimension {

	static fromSTAC(datacube, source, name) {
		const dim = new Dimension(datacube, name, source.type, source.axis);
		if (Array.isArray(source.values)) {
			dim.setValues(source.values);
		}
		else if (Array.isArray(source.extent) && source.extent.length === 2) {
			dim.setExtent(source.extent[0], source.extent[1]);
		}
		dim.setResolution(source.step);
		dim.setUnit(source.unit)
		if (!source.reference_system && source.type === 'spatial') {
			dim.setReferenceSystem(4326);
		}
		else {
			dim.setReferenceSystem(source.reference_system);
		}
		return dim;
	}

	static fromDimension(datacube, dimension) {
		const dim = new Dimension(datacube, dimension.name, dimension.type, dimension.axis);
		dim.values = dimension.values;
		dim.extent = dimension.extent;
		dim.resolution = dimension.resolution;
		dim.unit = dimension.unit;
		dim.referenceSystem = dimension.referenceSystem;
		return dim;
	}

	constructor(datacube, name, type = 'other', axis = null) {
		this.datacube = datacube;
		this.name = name;
		this.type = type;
		if (type === 'spatial') {
			this.axis = axis;
		}
		else {
			this.axis = null;
		}
		this.setValues([]);
		this.setResolution();
		this.setUnit();
		this.setReferenceSystem();
	}

	toSTAC() {
		const obj = {
			type: this.type
		};
		if (this.axis) {
			obj.axis = this.axis;
		}
		if (Array.isArray(this.extent) && this.extent.length === 2) {
			obj.extent = this.extent;
		}
		if (Array.isArray(this.values) && this.values.length > 0) {
			obj.values = this.values;
		}
		if (this.resolution) {
			obj.step = this.resolution;
		}
		if (this.unit) {
			obj.unit = this.unit;
		}
		if (this.referenceSystem) {
			obj.reference_system = this.referenceSystem;
		}
		return obj;
	}

	drop() {
		this.datacube.dropDimension(this.name);
	}

	rename(newName) {
		this.datacube.renameDimension(this.name, newName);
	}

	getType() {
		return this.type;
	}

	getResolution() {
		return this.resolution;
	}

	setResolution(resolution = null) {
		this.resolution = resolution;
	}

	getReferenceSystem() {
		return this.referenceSystem;
	}

	getUnit() {
		return this.unit;
	}

	setUnit(unit = '') {
		this.unit = unit;
	}

	setName(name) {
		this.name = name;
	}

	setReferenceSystem(newRefSys) {
		this.referenceSystem = newRefSys;
	}

	setExtent(min, max) {
		this.values = null;
		this.extent = [min, max];
	}

	setValues(values) {
		this.values = values;
		this.extent = null;
	}

	getValues() {
		return this.values;
	}

	addValue(value) {
		this.values.push(value);
	}

	min() {
		if (!Array.isArray(this.extent)) {
			return null;
		}
		if (typeof this.extent[0] !== 'undefined') {
			return this.extent[0];
		}
		else {
			return Math.min(this.values);
		}
	}

	max() {
		if (!Array.isArray(this.extent)) {
			return null;
		}
		if (typeof this.extent[1] !== 'undefined') {
			return this.extent[1];
		}
		else {
			return Math.max(this.values);
		}
	}

}
