export default class Dimension {

	constructor(datacube, options, name) {
		this.datacube = datacube;
		this.fromSTAC(options, name);
	}

	fromSTAC(source, name) {
		this.name = name;
		this.type = source.type || 'other';
		this.axis = source.type === 'spatial' ? source.axis : null;
		if (Array.isArray(source.values)) {
			this.values = source.values;
			this.extent = null;
		}
		else if (Array.isArray(source.extent) && source.extent.length === 2) {
			this.values = null;
			this.extent = source.extent;
		}
		else {
			this.values = [];
			this.extent = null;
		}
		this.resolution = source.step ? source.step : null;
		this.unit = source.unit ? source.unit : '';
		this.referenceSystem = source.reference_system;
		if (!this.referenceSystem && this.type === 'spatial') {
			this.referenceSystem = 4326;
		}
	}

	toSTAC() {
		const obj = {
			type: this.type
		};
		if (this.axis) {
			obj.axis = this.axis;
		}
		if (this.extent.length === 2) {
			obj.extent = this.extent;
		}
		if (this.values.length > 0) {
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

	setResolution(resolution) {
		this.resolution = resolution;
	}

	getReferenceSystem() {
		return this.referenceSystem;
	}

	crs() { // Alias
		return this.getReferenceSystem();
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
