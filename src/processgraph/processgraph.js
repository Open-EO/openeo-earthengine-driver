const { ProcessGraph } = require('@openeo/js-commons');
const GeeProcessGraphNode = require('./node');
const Errors = require('../errors');
const Utils = require('../utils');

module.exports = class GeeProcessGraph extends ProcessGraph {

	constructor(jsonProcessGraph, context) {
		super(jsonProcessGraph, context.server().processes());
		this.context = context;
	}

	getContext() {
		return this.context;
	}

	createNodeInstance(json, id, parent) {
		return new GeeProcessGraphNode(json, id, parent);
	}

	createProcessGraphInstance(json) {
		return new GeeProcessGraph(json, this.context);
	}

	async validateNode(node) {
		var process = this.getProcess(node);
		return await process.validate(node, this.context);
	}

	async executeNode(node) {
		var process = this.getProcess(node);
		return await process.execute(node, this.context);
	}

	addError(error) {
		this.errors.add(Errors.wrap(error));
	}

	// ToDo: Remove once we updated to js-commons v0.4.8, it's available there.
	getNodeCount() {
		return Utils.size(this.nodes);
	}

};