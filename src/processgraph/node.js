const DataCube = require('./datacube');
const { ProcessGraphNode } = require('@openeo/js-processgraphs');

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

	getContext() {
		return this.processGraph.getContext();
	}

	getServerContext() {
		return this.getContext().server();
	}

	getParameter(name) {
		return this.processGraph.getArgument(name);
	}

	getDataCube(name) {
		return new DataCube(this.getArgument(name));
	}

}