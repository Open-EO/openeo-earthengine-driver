const Errors = require('../errors');
const DataCube = require('./datacube');
const Utils = require('../utils');

module.exports = class ProcessGraphNode {

	constructor(json, id, parent) {
		if (typeof id !== 'string' || id.length === 0) {
			throw new Errors.NodeIdInvalid();
		}
		if (!Utils.isObject(json)) {
			throw new Errors.NodeInvalid({node_id: id});
		}
		if (typeof json.process_id !== 'string') {
			throw new Errors.ProcessIdMissing({node_id: id});
		}

		this.id = id;
		this.processGraph = parent;
		this.process_id = json.process_id;
		this.arguments = json.arguments || {};
		this.isResultNode = json.result || false;
		this.expectsFrom = [];
		this.passesTo = [];
		this.provision = {};
		this.reset();
	}

	setProvision(name, data) {
		this.provision[name] = data;
	}

	getProvision() {
		return this.provision[name];
	}

	getProcessGraph() {
		return this.processGraph;
	}

	getArgumentNames() {
		return Object.keys(this.arguments);
	}

	getArgument(name, defaultValue = undefined, getResult = true) {
		var arg = typeof this.arguments[name] === 'undefined' ? defaultValue : this.arguments[name];
		return this.processArgument(arg, getResult);
	}

	getData(name) {
		return new DataCube(this.getArgument(name));
	}

	static getType(obj, reportNullAs = 'null') {
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

	processArgument(arg, getResult = true) {
		var type = ProcessGraphNode.getType(arg);
		switch(type) {
			case 'result':
				if (getResult) {
					return this.processGraph.getNode(arg.from_node).getResult();
				}
				else {
					return arg;
				}
			case 'callback':
				return arg.callback;
			case 'callback-argument':
				if (getResult) {
					return this.processGraph.getParameter(arg.from_argument);
				}
				else {
					return arg;
				}
			case 'variable':
				return this.processGraph.getVariableValue(arg.variable_id);
			case 'array':
			case 'object':
				for(var i in arg) {
					arg[i] = this.processArgument(arg[i], getResult);
				}
				return arg;
			default:
				return arg;
		}
	}

	isStartNode() {
		return (this.expectsFrom.length === 0);
	}

	addPreviousNode(node) {
		this.expectsFrom.push(node);
	}

	getPreviousNodes() {
		return this.expectsFrom;
	}

	addNextNode(node) {
		this.passesTo.push(node);
	}

	getNextNodes() {
		return this.passesTo;
	}

	reset() {
		this.result = null;
		this.resultsAvailableFrom = [];
	}

	setResult(result) {
		this.result = result;
	}

	getResult() {
		return this.result;
	}

	solveDependency(dependencyNode) {
		if (dependencyNode !== null && this.expectsFrom.includes(dependencyNode)) {
			this.resultsAvailableFrom.push(dependencyNode);
		}
		return (this.expectsFrom.length === this.resultsAvailableFrom.length); // all dependencies solved?
	}

}