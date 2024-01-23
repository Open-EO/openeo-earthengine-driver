import { ProcessGraph } from '@openeo/js-processgraphs';
import GeeJsonSchemaValidator from './jsonschema.js';
import GeeProcessGraphNode from './node.js';
import Errors from '../utils/errors.js';
import Utils from '../utils/utils.js';
const epsg = Utils.require('epsg-index/all.json');

export default class GeeProcessGraph extends ProcessGraph {

	constructor(process, context, jsonSchemaValidator = null) {
		super(process, context.server().processes(), jsonSchemaValidator);
		this.context = context;
		this.loadCollectionRect = null;
		this.logger = null;
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
		// Optimization for web services to only load the extent of the data that is needed if no spatial extent is defined by the load_collection process
		if (this.loadCollectionRect && json.process_id === 'load_collection' && Utils.isObject(json.arguments) && !json.arguments.spatial_extent) {
			// ToDo perf: If an extent exists, use the intersecting area between tile and user-selected bounding box to further improve runtime.
			json.arguments.spatial_extent = this.loadCollectionRect;
		}
		return new GeeProcessGraphNode(json, id, parent);
	}

	createProcessGraphInstance(process) {
		const pg = new GeeProcessGraph(process, this.context);
		pg.setLogger(this.getLogger());
		return pg;
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
		await this.context.connectGee();
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

	optimizeLoadCollectionRect(rect) {
		this.loadCollectionRect = rect;
	}

	addError(error) {
		this.errors.add(Errors.wrap(error));
	}

}
