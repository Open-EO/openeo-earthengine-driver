const Errors = require('../errors');
const ProcessGraphNode = require('./node');

const VARIABLE_TYPES = ['string', 'number', 'boolean', 'array', 'object'];

module.exports = class ProcessGraph {

	constructor(jsonProcessGraph, parentNode = null) {
		this.json = jsonProcessGraph;
		this.nodes = [];
		this.startNodes = {};
		this.resultNode = null;
		this.childrenProcessGraphs = [];
		this.parentNode = parentNode;
		this.variables = {};
	}

	parse() {
		for(var id in this.json) {
			this.nodes[id] = new ProcessGraphNode(this.json[id], id, this);
		}

		for(var id in this.nodes) {
			var node = this.nodes[id];

			if (node.isResultNode) {
				if (this.resultNode !== null) {
					throw this.parentNode ? new Errors.MultipleResultNodesCallback({node_id: this.parentNode.id, process_id: node.process_id}) : new Errors.MultipleResultNodes();
				}
				this.resultNode = node;
			}

			this.parseArguments(id, node);
		}

		if (!this.findStartNodes()) {
			throw this.parentNode ? new Errors.StartNodeMissing({node_id: this.parentNode.id, process_id: node.process_id}) : new Errors.StartNodeMissing();
		}
		if (this.resultNode === null) {
			throw this.parentNode ? new Errors.ResultNodeMissing({node_id: this.parentNode.id, process_id: node.process_id}) : new Errors.ResultNodeMissing();
		}
	}

	parseArguments(nodeId, node, args) {
		if (typeof args === 'undefined') {
			args = node.arguments;
		}
		for(var i in args) {
			var arg = args[i];
			var type = this.getType(arg);
			switch(type) {
				case 'result':
					this.connectNodes(node, arg.from_node);
					break;
				case 'variable':
					this.parseVariable(arg);
					break;
				case 'callback':
					arg.callback = this.createCallback(node, arg.callback);
					break;
				case 'array':
				case 'object':
					this.parseArguments(nodeId, node, arg);
					break;
			}
		}
	}

	parseVariable(variable) {
		// Check whether the variable id is valid
		if (typeof variable.variable_id !== 'string') {
			throw new Errors.VariableIdInvalid();
		}
		var obj = {};

		// Check whether the data type is valid
		if (typeof variable.type !== 'undefined' && !VARIABLE_TYPES.includes(variable.type)) {
			throw new Errors.VariableTypeInvalid(variable);
		}
		obj.type = typeof variable.type !== 'undefined' ? variable.type : 'string';

		// Check whether the defult value has the correct data type
		var defaultType = this.getType(variable.default);
		if (defaultType !== 'undefined') {
			if (defaultType !== obj.type) {
				throw new Errors.VariableDefaultValueTypeInvalid(variable);
			}
			else {
				obj.value = variable.default;
			}
		}
	}

	setVariableValues(variables) {
		for(var i in variables) {
			this.setVariable(i, variables[i]);
		}
	}

	setVariableValue(id, value) {
		if (typeof this.variables[id] !== 'object') {
			this.variables[id] = {};
		}
		this.variables[id].value = value;
	}

	getVariableValue(id) {
		var variable = this.variables[id];
		if (typeof variable !== 'object' || typeof variable.value === 'undefined') {
			throw new Errors.VariableValueMissing({variable_id: id});
		}
		var type = this.getType(variable.value);
		if (type !== variable.type) {
			throw new Errors.VariableValueTypeInvalid({variable_id: id, type: variable.type});
		}

		return this.variables[id].value;
	}

	createCallback(node, jsonProcessGraph) {
		var pg = new ProcessGraph(jsonProcessGraph, node);
		this.childrenProcessGraphs.push(pg);
		return pg;
	}

	connectNodes(node, prevNodeId) {
		var prevNode = this.nodes[prevNodeId];
		if (typeof prevNode === 'undefined') {
			throw new Errors.ReferencedNodeMissing({node_id: prevNodeId});
		}
		node.addPreviousNode(prevNode);
		prevNode.addNextNode(node);
	}

	getType(obj, reportNullAs = 'null') {
		if (typeof obj === 'object') {
			if (obj === null) {
				return reportNullAs;
			}
			else if (Array.isArray(obj)) {
				return 'array';
			}
			else if(obj.hasOwnProperty("callback")) {
				return 'callback';
			}
			else if(obj.hasOwnProperty("variable_id")) {
				return 'variable';
			}
			else if(obj.hasOwnProperty("from_node")) {
				return 'result';
			}
			else if(obj.hasOwnProperty("from_argument")) {
				return 'callback-argument';
			}
			else {
				return 'object';
			}
		}
		return (typeof obj);
	}

	findStartNodes() {
		var found = false;
		for(var id in this.nodes) {
			var node = this.nodes[id];
			if (node.isStartNode()) {
				this.startNodes[id] = node;
				found = true;
			}
		}
		return found;
	}

	reset() {
		for(var id in this.nodes) {
			this.nodes[id].reset();
		}
		this.childrenProcessGraphs.forEach(child => child.reset());
	}

	getResultNode() {
		return this.resultNode;
	}

	getStartNodes() {
		return Object.values(this.startNodes);
	}

	getStartNodeIds() {
		return Object.keys(this.startNodes);
	}

	getNode(nodeId) {
		return this.nodes[nodeId];
	}

	getNodes() {
		return this.nodes;
	}

	getJson() {
		return this.json;
	}

};