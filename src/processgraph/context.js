const Utils = require('../utils');
const Errors = require('../errors');

module.exports = class ProcessingContext {

	// ToDo: extent, dimension and other must be stored per node?! otherwise parallel processing will fail
	constructor(serverContext, userId = null, synchronousRequest = false) {
		this.serverContext = serverContext;
		this.userId = userId;
		this.variables = {};
		this.synchronousRequest = synchronousRequest;
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

	setVariables(variables) {
		this.variables = variables;
	}

	getVariable(id) {
		return this.variables[id];
	}

	getUserId() {
		return this.userId;
	}

	isSynchronousRequest() {
		return this.synchronousRequest;
	}

};