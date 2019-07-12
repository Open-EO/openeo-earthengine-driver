module.exports = class Dimension {

	constructor(datacube, options) {
		this.datacube = datacube;
		this.fromSTAC(options);
	}

	fromSTAC(source) {
		this.type = source.type || 'other';
		this.axis = source.type === 'spatial' ? source.axis : null;
		this.extent = Array.isArray(source.extent) && source.extent.length == 2 ? source.extent : [];
		this.values = Array.isArray(source.values) ? source.values : [];
		this.resolution = source.step ? source.step : null;
		this.unit = source.unit ? source.unit : '';
		this.referenceSystem = source.reference_system;
	}

	toSTAC() {
		var obj = {
			type: this.type
		};
		if (this.axis) {
			obj.axis = this.axis;
		}
		if (this.extent.length == 2) {
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
		this.datacube.dropDimension(this);
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

	setReferenceSystem(refSys) {
		this.referenceSystem = refSys;
	}

	setExtent(e, e2 = null) {
		this.values = [];
		if (Array.isArray(e) && e.length == 2) {
			this.extent = e;
		}
		else {
			this.extent = [e, e2];
		}
	}

	setValues(values) {
		this.values = values;
		this.extent = [];
	}

	getValues(){
		return this.values;
	}

	addValue(value) {
		this.values.push(value);
	}

	min() {
		if (typeof this.extent[0] !== 'undefined') {
			return this.extent[0];
		}
		else {
			return Math.min(this.values);
		}
	}

	max() {
		if (typeof this.extent[1] !== 'undefined') {
			return this.extent[1];
		}
		else {
			return Math.max(this.values);
		}
	}

};