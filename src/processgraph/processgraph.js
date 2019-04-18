const Errors = require('../errors');
const ProcessGraphNode = require('./node');
const Utils = require('../utils');
const util = require('util');

const VARIABLE_TYPES = ['string', 'number', 'boolean', 'array', 'object'];

module.exports = class ProcessGraph {

	constructor(jsonProcessGraph, context) {
		this.json = jsonProcessGraph;
		this.context = context;
		this.nodes = [];
		this.startNodes = {};
		this.resultNode = null;
		this.childrenProcessGraphs = [];
		this.parentNode = null;
		this.parentParameterName = null;
		this.variables = {};
		this.parsed = false;
		this.validated = false;
		this.errors = new ErrorList();
		this.parameters = {};
	}

	setParent(node, parameterName) {
		this.parentNode = node;
		this.parentParameterName = parameterName;
	}

	isValid() {
		return this.validated && this.errors.count() === 0;
	}

	parse() {
		if (this.parsed) {
			return;
		}

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

		if (!this._findStartNodes()) {
			throw this.parentNode ? new Errors.StartNodeMissing({node_id: this.parentNode.id, process_id: node.process_id}) : new Errors.StartNodeMissing();
		}
		if (this.resultNode === null) {
			throw this.parentNode ? new Errors.ResultNodeMissing({node_id: this.parentNode.id, process_id: node.process_id}) : new Errors.ResultNodeMissing();
		}

		this.parsed = true;
	}

	async validate(throwOnErrors = true) {
		if (this.validated) {
			return;
		}

		this.validated = true;

		// Parse
		try {
			this.parse();
		} catch (error) {
			this.errors.add(error);
		}

		// Validate
		await this._validateNodes(this.getStartNodes(), throwOnErrors);
		return this.errors;
	}

	async execute(parameters = null) {
		await this.validate();
		this.reset();
		this.setParameters(parameters);
		await this._executeNodes(this.getStartNodes());
		return this.getResultNode();
	}

	async _validateNodes(nodes, throwsOnErrors, previousNode = null) {
		if (nodes.length === 0) {
			return;
		}

		var promises = nodes.map(async (node) => {
			// Validate this node after all dependencies are available
			if (!node.solveDependency(previousNode)) {
				return;
			}

			// Get process and validate
			try {
				var process = this._getProcess(node);
				await process.validate(node, this.context);
			} catch (e) {
				if (e instanceof ErrorList) {
					this.errors.merge(e);
					if (throwsOnErrors) {
						throw e.first();
					}
				}
				else {
					this.errors.add(e);
					if (throwsOnErrors) {
						throw e;
					}
				}
			}
			await this._validateNodes(node.getNextNodes(), throwsOnErrors, node);
		});

		await Promise.all(promises);
	}

	async _executeNodes(nodes, previousNode = null) {
		if (nodes.length === 0) {
			return;
		}

		var promises = nodes.map(async (node) => {
			// Execute this node after all dependencies are available
			if (!node.solveDependency(previousNode)) {
				return;
			}

			if (this.context.server().debug) {
				console.debug(node.id + ": calling " + node.process_id + " with " + util.inspect(node.arguments, {depth: 1}));
			}

			var process = this._getProcess(node);
			var result = await process.execute(node, this.context);
			node.setResult(result);
			
			if (this.context.server().debug) {
				console.debug(node.id + ": returning from " + node.process_id);
			}

			// Execute next nodes in chain
			await this._executeNodes(node.getNextNodes(), node);

		});

		return Promise.all(promises);
	}

	parseArguments(nodeId, node, args) {
		if (typeof args === 'undefined') {
			args = node.arguments;
		}
		for(var argumentName in args) {
			var arg = args[argumentName];
			var type = ProcessGraphNode.getType(arg);
			switch(type) {
				case 'result':
					this.connectNodes(node, arg.from_node);
					break;
				case 'variable':
					this.parseVariable(arg);
					break;
				case 'callback':
					arg.callback = this.createProcessGraph(arg.callback, node, argumentName);
					break;
				case 'callback-argument':
					this.parseCallbackArgument(node, arg.from_argument);
					break;
				case 'array':
				case 'object':
					this.parseArguments(nodeId, node, arg);
					break;
			}
		}
	}

	parseCallbackArgument(node, name) {
		// ToDo: Parse callback argument
	}

	createProcessGraph(json, node, argumentName) {
		var pg = new ProcessGraph(json, this.context);
		pg.setParent(node, argumentName);
		pg.parse();
		this.childrenProcessGraphs.push(pg);
		return pg;
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
		var defaultType = ProcessGraphNode.getType(variable.default);
		if (defaultType !== 'undefined') {
			if (defaultType !== obj.type) {
				throw new Errors.VariableDefaultValueTypeInvalid(variable);
			}
			else {
				obj.value = variable.default;
			}
		}
	}

	setParameters(parameters) {
		if (typeof parameters === 'object' && parameters !== null) {
			this.parameters = parameters;
		}
	}

	getParameter(name) {
		return this.parameters[name];
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
		var type = ProcessGraphNode.getType(variable.value);
		if (type !== variable.type) {
			throw new Errors.VariableValueTypeInvalid({variable_id: id, type: variable.type});
		}

		return this.variables[id].value;
	}

	connectNodes(node, prevNodeId) {
		var prevNode = this.nodes[prevNodeId];
		if (typeof prevNode === 'undefined') {
			throw new Errors.ReferencedNodeMissing({node_id: prevNodeId});
		}
		node.addPreviousNode(prevNode);
		prevNode.addNextNode(node);
	}

	isSimpleReducer() {
		return (this.isReducer() && this.nodes.length === 1);
	}

	isReducer() {
		if (!this.parentNode) {
			return false;
		}

		var process = this._getProcess(this.parentNode);
		return (process.schema['gee:reducer'] === true);
	}

	_findStartNodes() {
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

	getErrors() {
		return this.errors;
	}

	_getProcess(node) {
		var process = this.context.server().processes().get(node.process_id);
		if (process === null) {
			throw new Errors.ProcessUnsupported({process: node.process_id});
		}
		return process;
	}

	getCallbackParameters() {
		if (!this.parentNode || !this.parentParameterName) {
			return {};
		}

		var process = this._getProcess(this.parentNode);
		var schema = process.schema.parameters[this.parentParameterName].schema;
		if (Utils.isObject(schema.parameters)) {
			return schema.parameters;
		}

		// ToDo: If a process parameter supports multiple different callbacks, i.e. reduce with either an array of two separate values, this
		// can't be separated accordingly and we just return all potential values. So it might happen that people get a successful validation
		// but they used the wrong callback parameters.

		var cbParams = {};
		var choice = schema.anyOf || schema.oneOf || schema.allOf;
		if (Array.isArray(choice)) {
			for(let i in choice) {
				var p = choice[i];
				if (Utils.isObject(p.parameters)) {
					Object.assign(cbParams, p.parameters);
				}
			}
		}

		return cbParams;
	}

};



class ErrorList {

	constructor() {
		this.errors = [];
	}

	first() {
		return this.errors[0];
	}

	merge(errorList) {
		this.errors.concat(errorList.getAll());
	}
	
	add(error) {
		this.errors.push(Errors.wrap(error));
	}

	count() {
		return this.errors.length;
	}

	toJSON() {
		return this.errors.map(e => e.toJSON());
	}

	getMessage() {
		var msg = '';
		for (var i in this.errors) {
			msg += (i+1) + ". " + this.errors[i].message + "\r\n";
		}
		return msg.trim();
	}

	getAll() {
		return this.errors;
	}

}