const Utils = require('../utils');
const Errors = require('../errors');

module.exports = class ProcessingContext {

	// ToDo: extent, dimension and other must be stored per node?! otherwise parallel processing will fail
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

	getUserId() {
		return this.userId;
	}

	async retrieveResults(dataCube, size = 2000, defaultFormat = "jpeg", bounds = null) {
		// Execute graph
		var format = dataCube.getOutputFormat() || defaultFormat;
		if (format.toLowerCase() !== 'json') {
			var bounds = bounds || dataCube.getSpatialExtentAsGeeGeometry();
//			if (syncResult) {
				return new Promise((resolve, reject) => {
					dataCube.image().getThumbURL({
						format: this.translateOutputFormat(format),
						dimensions: size,
						region: bounds.bounds().getInfo()
					}, url => {
						if (!url) {
							reject(new Errors.Internal({message: 'Download URL provided by Google Earth Engine is empty.'}));
						}
						else {
							resolve(url);
						}
					});
				});
/*			}
			else {
				var options = {
					name: "openeo",
					dimensions: size,
					region: bounds
				};
				image.getDownloadURL(options, url => {
					if (!url) {
						reject(new Errors.Internal({message: 'Download URL provided by Google Earth Engine is empty.'}));
					}
					else {
						resolve(url);
					}
				});
			} */
		}
		else {
			var fileName = Utils.generateHash() + "/result-" + Date.now() +  "." + this.translateOutputFormat(format);
			var p = path.normalize(path.join(this.serverContext.getTempFolder(), fileName));
			var parent = path.dirname(p);
			await fse.ensureDir(parent);
			await fse.writeJson(p, dataCube.getData());
			return Utils.getApiUrl("/temp/" + fileName);
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