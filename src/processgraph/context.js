const Utils = require('../utils');
const Errors = require('../errors');
const path = require('path');
const fse = require('fs-extra');

module.exports = class ProcessingContext {

	constructor(serverContext, userId = null) {
		this.serverContext = serverContext;
		this.userId = userId;
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

	getJob(jobId) { // returns promise
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

	setUserId(userId) {
		this.userId = userId;
	}

	getUserId() {
		return this.userId;
	}

	// TODO: the selection of formats and bands is really strict at the moment, maybe some of them are too strict
	async retrieveResults(dataCube, size = 2000, bounds = null) {
		var format = dataCube.getOutputFormat() || "jpeg";
		switch(format.toLowerCase()) {
			case 'jpeg':
			case 'png':
				if (!bounds) {
					bounds = dataCube.getSpatialExtentAsGeeGeometry();
				}
				return new Promise((resolve, reject) => {
					var visBands = null;
					var availableBands = dataCube.getBands();
					var parameters = dataCube.getOutputFormatParameters(); // this will be important/used in the future
					if (parameters.red && parameters.green && parameters.blue){
						visBands = [parameters.red, parameters.green, parameters.blue];
					}
					else if(parameters.gray){
						visBands = [parameters.gray];
					}
					else if (parameters.red || parameters.green || parameters.blue) {
						throw new Errors.ProcessArgumentInvalid({
							argument: "options",
							process: "save_result",
							reason: "The output band definitions are not properly given."
						});
					}
					else {
						// ToDo: Write the following warning to the logs:
						// "No bands are specified in the output parameter settings. The first band will be used for a gray-value visualisation."
						visBands = [availableBands[0]];
					}
					dataCube.image().visualize({min: 0, max: 255, bands: visBands}).getThumbURL({
						format: this.translateOutputFormat(format),
						dimensions: size,
						region: bounds.bounds().getInfo()
					}, url => {
						if (typeof url !== 'string' || url.length === 0) {
							reject(new Errors.Internal({message: 'Download URL provided by Google Earth Engine is empty.'}));
						}
						else {
							resolve(url);
						}
					});
				});
			case 'json':
				var fileName = Utils.generateHash() + "/result-" + Date.now() +  "." + this.translateOutputFormat(format);
				var p = path.normalize(path.join(this.serverContext.getTempFolder(), fileName));
				var parent = path.dirname(p);
				await fse.ensureDir(parent);
				await fse.writeJson(p, dataCube.getData());
				return Utils.getApiUrl("/temp/" + fileName);
			default:
				throw new Error('File format not supported.');
		}
	}

	translateOutputFormat(format) {
		format = format.toLowerCase();
		switch(format) {
			case 'jpeg':
				return 'jpg';
			default:
				return format;
		}
	}

};