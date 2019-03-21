const Errors = require('../errors');

const VARIABLE_TYPES = ['string', 'number', 'boolean', 'array', 'object'];

module.exports = class ProcessGraph {

	constructor(jsonProcessGraph, parent_node_id = null) {
		this.nodes = jsonProcessGraph;
		this.startNodes = [];
		this.resultNode = null;
		this.parent_node_id = parent_node_id;
		this.parse();
	}

	parse() {
		for(var id in this.nodes) {
			var node = this.nodes[id];
			node.expectsFrom = [];

			if (node.result) {
				if (this.resultNode !== null) {
					throw this.parent_node_id ? new Errors.MultipleResultNodesCallback({node_id: this.parent_node_id, process_id: node.process_id}) : new Errors.MultipleResultNodes();
				}
				this.resultNode = id;
			}

			this.parseArguments(id, node);
		}

		for(var id in this.nodes) {
			if (this.nodes[id].expectsFrom.length === 0) {
				this.startNodes.push(id);
			}
		}

		if (this.startNodes.length === 0) {
			throw this.parent_node_id ? new Errors.StartNodeMissing({node_id: this.parent_node_id, process_id: node.process_id}) : new Errors.StartNodeMissing();
		}
		if (this.resultNode === null) {
			throw this.parent_node_id ? new Errors.ResultNodeMissing({node_id: this.parent_node_id, process_id: node.process_id}) : new Errors.ResultNodeMissing();
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
					var otherNodeId = arg.from_node;
					if (typeof this.nodes[otherNodeId] === 'undefined') {
						throw new Errors.ReferencedNodeMissing({node_id: otherNodeId});
					}
					node.expectsFrom.push(otherNodeId);
					if (typeof this.nodes[otherNodeId].passesTo === 'undefined') {
						this.nodes[otherNodeId].passesTo = [];
					}
					this.nodes[otherNodeId].passesTo.push(nodeId);
					break;
				case 'variable':
					this.parseVariable(arg);
					break;
				case 'callback':
					arg.callback = new ProcessGraph(arg.callback, nodeId);
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

		// Check whether the data type is valid
		if (typeof variable.type !== 'undefined' && !VARIABLE_TYPES.includes(variable.type)) {
			throw new Errors.VariableTypeInvalid(variable);
		}

		// Check whether the defult value has the correct data type
		let varType = typeof variable.type !== 'undefined' ? variable.type : 'string';
		var defaultType = this.getType(variable.default);
		if (defaultType !== 'undefined' && defaultType !== varType) {
			throw new Errors.VariableDefaultValueTypeInvalid(variable);
		}
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

	getResultNode() {
		return this.resultNode;
	}

	getStartNodes() {
		return this.startNodes;
	}

	getNode(nodeId) {
		return this.nodes[nodeId];
	}

	getNodes() {
		return this.nodes;
	}

};