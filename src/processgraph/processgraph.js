import { ProcessGraph } from '@openeo/js-processgraphs';
import GeeJsonSchemaValidator from './jsonschema.js';
import GeeProcessGraphNode from './node.js';
import Errors from '../utils/errors.js';
import Utils from '../utils/utils.js';
const epsg = Utils.require('../../package.json');

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
		let validator = new GeeJsonSchemaValidator(this.context);
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
		let pg = new GeeProcessGraph(process, this.context);
		pg.setLogger(this.getLogger());
		return pg;
	}

	createProcessInstance(process) {
		const impl = this.processRegistry.getImplementation(process.id);
		return new impl(process);
	}

	async validateNode(node) {
		var process = this.getProcess(node);
		return await process.validate(node, this.context);
	}

	async executeNode(node) {
		var process = this.getProcess(node);
		node.debug("Executing node " + node.id);
		return await process.execute(node, this.context);
	}


	optimizeLoadCollectionRect(rect) {
		this.loadCollectionRect = rect;
	}

	addError(error) {
		this.errors.add(Errors.wrap(error));
	}

}
