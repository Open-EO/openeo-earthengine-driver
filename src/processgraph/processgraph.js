const { ProcessGraph } = require('@openeo/js-commons');
const GeeProcessGraphNode = require('./node');
const Errors = require('../errors');

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

	isSimpleReducer() {
		return (this.isReducer() && this.nodes.length === 1);
	}

	isReducer() {
		var process = this.getParentProcess();
		return (process && process.schema['gee:reducer'] === true);
	}

	addError(error) {
		this.errors.add(Errors.wrap(error));
	}

};