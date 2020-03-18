const Utils = require('../utils');
const Errors = require('../errors');
const path = require('path');
const fse = require('fs-extra');

module.exports = class ProcessingContext {

	constructor(serverContext, userId = null) {
		this.serverContext = serverContext;
		this.userId = userId;
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
	async retrieveResults(dataCube, bbox = null) {
		var parameters = dataCube.getOutputFormatParameters();
		var format = dataCube.getOutputFormat() || "png";
		// Handle CRS setting
		switch(format.toLowerCase()) {
			case 'jpeg':
			case 'png':
				if (!parameters.epsgCode) {
					parameters.epsgCode = 3857;
				}
		}
		if (parameters.epsgCode > 0) {
			dataCube.setCrs(parameters.epsgCode);
		}
		// Get bounding box after changing the CRS
		if (!bbox) {
			bbox = dataCube.getSpatialExtent();
		}
		var region = Utils.bboxToGeoJson(bbox);
		switch(format.toLowerCase()) {
			case 'jpeg':
			case 'png':
				var visBands = null;
				var visPalette = null;
				if (Array.isArray(parameters.palette)) {
					visPalette = parameters.palette;
				}
				else if (parameters.red && parameters.green && parameters.blue){
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
					visBands = dataCube.getEarthEngineBands().slice(0, 1);
					if (visBands[0] !== '#') {
						console.log("No bands are specified in the output parameter settings. The first band will be used for a gray-value visualisation.");
					}
				}
				return new Promise((resolve, reject) => {
					dataCube.image().visualize({min: 0, max: 255, bands: visBands, palette: visPalette}).getThumbURL({
						format: this.getEarthEngineFormat(format),
						dimensions: parameters.size || 1000,
						region: region,
						crs: Utils.crsToString(bbox.crs)
					}, (url, err) => {
						if (typeof err === 'string') {
							reject(new Errors.Internal({message: err}));
						}
						else if (typeof url !== 'string' || url.length === 0) {
							reject(new Errors.Internal({message: 'Download URL provided by Google Earth Engine is empty.'}));
						}
						else {
							resolve(url);
						}
					});
				});
			case 'gtiff':
				return new Promise((resolve, reject) => {
					dataCube.image().getThumbURL({
						format: this.getEarthEngineFormat(format),
						dimensions: parameters.size || 1000,
						region: region,
						crs: Utils.crsToString(bbox.crs)
					}, (url, err) => {
						if (typeof err === 'string') {
							reject(new Errors.Internal({message: err}));
						}
						else if (typeof url !== 'string' || url.length === 0) {
							reject(new Errors.Internal({message: 'Download URL provided by Google Earth Engine is empty.'}));
						}
						else {
							resolve(url);
						}
					});
				});
			case 'json':
				var fileName = Utils.generateHash() + "/result-" + Date.now() +  "." + this.getExtension(format);
				var p = path.normalize(path.join(this.serverContext.getTempFolder(), fileName));
				var parent = path.dirname(p);
				await fse.ensureDir(parent);
				await fse.writeJson(p, dataCube.getData());
				return Utils.getApiUrl("/temp/" + fileName);
			default:
				throw new Error('File format not supported.');
		}
	}

	getDataUrl(image, format, parameters, bbox) {
	}

	getEarthEngineFormat(format) {
		format = format.toLowerCase();
		switch(format) {
			case 'jpeg':
				return 'jpg';
			case 'gtiff':
				return 'geotiff';
			default:
				return format;
		}
	}

	getExtension(format) {
		format = format.toLowerCase();
		switch(format) {
			case 'jpeg':
				return 'jpg';
			case 'gtiff':
				return 'tif';
			default:
				return format;
		}
	}

};