const Utils = require('../utils');
const Errors = require('../errors');

module.exports = class ProcessingContext {

	constructor(serverContext, userId = null) {
		this.serverContext = serverContext;
		this.userId = userId;
		this.extent = null;
		this.dimensions = {};
		this.variables = {};
	}

	server() {
		return this.serverContext;
	}

	getCollection(id) {
		return this.serverContext.collections().getData(id);
	}

	getStoredProcessGraph(id) { // returns promise
		return this.serverContext.storedProcessGraphs().getById(id);
	}

	validateProcessGraph(pg, context) {
		var runner = this.context.processes().createRunner(pg);
		return runner.validate(context);
	}

	executeProcessGraph(pg, context) {
		var runner = this.context.processes().createRunner(pg);
		return runner.execute(context);
	}

	isJob(jobId) { // returns promise
		return this.serverContext.jobs().getById(jobId);
	}

	isFileFromWorkspace(file) { // returns promise
		var p = this.workspace.getPath(this.userId, file);
		if (!p) {
			throw new Errors.FilePathInvalid();
		}
		return Promise.resolve(Utils.isFile(p));
	}

	readFileFromWorkspace(file) { // returns promise
		return this.serverContext.files().getFileContents(this.userId, file);
	}

	importFromCollection(id) {
		var collection = this.getCollection(id);
		// Import dimensions
		this.dimensions = collection.properties['cube:dimensions'];
	}

	setVariables(variables) {
		this.variables = variables;
	}

	getVariable(id) {
		return this.variables[id];
	}

	getUserId() {
		return this.userId;
	}

	setSpatialExtent(extent) {
		this.extent = extent;
		// ToDo: Set the bbox in the dimensions
	}

	setSpatialExtentFromGeometry() {
		// ToDo: Set the bbox from a geometry
	}

	getSpatialExtent() {
		return ee.Geometry.Rectangle([this.extent.west, this.extent.south, this.extent.east, this.extent.north], this.extent.crs);
	}

	setResolution() {
		// ToDo: Set resoltion in the dimensions
	}

	setProjection() {
		// ToDo: Set the projection in the dimensions
	}

	getDimension(name) {
		return this.dimensions[name] ? this.dimensions[name] : null;
	}

	getDimensionNames() {
		return Object.keys(this.dimensions);
	}

	addDimension(name, type) {
		// ToDo: Make more useful and compliant to STAC data cube extension. Can it handle what add_dimension asks for?
		this.dimensions[name] = {
			type: type
		};
	}

	dropDimension(name) {
		// ToDo: Don't forget to drop the actual data?!
		delete this.dimensions[name];
	}

};