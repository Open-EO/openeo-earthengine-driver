import { ProcessGraph } from '@openeo/js-processgraphs';
import GeeJsonSchemaValidator from './jsonschema.js';
import GeeProcessGraphNode from './node.js';
import Errors from '../utils/errors.js';
import Utils from '../utils/utils.js';
const epsg = Utils.require('epsg-index/all.json');

export default class GeeProcessGraph extends ProcessGraph {

	constructor(process, context, logger = null) {
		super(process, context.server().processes());
		this.context = context;
		this.logger = logger;
		this.constraints = {};
		this.results = [];
	}

	addResult(dc) {
		this.results.push(dc);
	}

	getResults() {
		return this.results;
	}

	getContext() {
		return this.context;
	}

	getLogger() {
		return this.logger;
	}

	setLogger(logger) {
		this.logger = logger;
	}

	createJsonSchemaValidatorInstance() {
		const validator = new GeeJsonSchemaValidator(this.context);
		validator.setEpsgCodes(Object.keys(epsg));
		return validator;
	}

	createNodeInstance(json, id, parent) {
		return new GeeProcessGraphNode(json, id, parent);
	}

	createProcessGraphInstance(process) {
		return new GeeProcessGraph(process, this.context, this.getLogger());
	}

	createProcessInstance(process) {
		const impl = this.processRegistry.getImplementation(process.id);
		return new impl(process);
	}

	async validateNode(node) {
		const process = this.getProcess(node);
		if (process) {
			return await process.validate(node, this.context);
		}
	}

	async execute(args = null) {
		if (this.parentNode === null) {
			await this.context.connectGee();
		}
		return await super.execute(args);
	}

	async executeNode(node) {
		node.debug(`Executing node ${node.id}`);
		const process = this.getProcess(node);
		return await process.execute(node, this.context);
	}

	// For callbacks, if needed
	// Doesn't validate, should be run explicitly before execute.
	// Also, setArguments should be called before.
	executeSync() {
		this.reset();
		this.executeNodesSync(this.getStartNodes());
		return this.getResultNode();
	}

	executeNodesSync(nodes, previousNode = null) {
		if (nodes.length === 0) {
			return;
		}

		nodes.forEach(node => {
			if (!node.solveDependency(previousNode)) {
				return;
			}
			node.setResult(this.executeNodeSync(node));
			this.executeNodesSync(node.getNextNodes(), node);
		});
	}

	executeNodeSync(node) {
		node.debug(`Executing node ${node.id} (sync)`);
		const process = this.getProcess(node);
		return process.executeSync(node);
	}

	addError(error) {
		this.errors.add(Errors.wrap(error));
	}

	setAdditionalConstraint(process, parameter, value) {
		if (!this.constraints[process]) {
			this.constraints[process] = {};
		}
		this.constraints[process][parameter] = value;
	}

	getAdditionalConstraint(process, parameter) {
		if (this.constraints[process]) {
			return this.constraints[process][parameter];
		}
		return undefined;
	}

}
