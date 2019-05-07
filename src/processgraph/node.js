const DataCube = require('./datacube');
const { ProcessGraphNode } = require('@openeo/js-commons');

module.exports = class GeeProcessGraphNode extends ProcessGraphNode {

	constructor(json, id, parent) {
		super(json, id, parent);
		this.provision = {};
	}

	setProvision(name, data) {
		this.provision[name] = data;
	}

	getProvision() {
		return this.provision[name];
	}

	getData(name) {
		return new DataCube(this.getArgument(name));
	}

}