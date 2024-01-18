import Utils from '../utils/utils.js';
import HttpUtils from '../utils/http.js';
import Errors from '../utils/errors.js';
import path from 'path';
import fse from 'fs-extra';

export default class ProcessingContext {

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
		return Promise.resolve(HttpUtils.isFile(p));
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

	// ToDo processes: the selection of formats and bands is really strict at the moment, maybe some of them are too strict
	async retrieveResults(dataCube) {
		var logger = dataCube.getLogger();
		var parameters = dataCube.getOutputFormatParameters();
		var format = dataCube.getOutputFormat();
		if (typeof format === 'string') {
			format = format.toLowerCase();
		}
		else {
			format = 'png';
		}
		// Handle CRS + bbox settings
		if (!parameters.epsgCode && (format === 'jpeg' || format === 'png')) {
			dataCube.setCrs(4326);
		}
		else if (parameters.epsgCode > 0) {
			dataCube.setCrs(parameters.epsgCode);
		}
		var region = Utils.bboxToGeoJson(dataCube.getSpatialExtent());
		var crs = Utils.crsToString(dataCube.getCrs());

		switch(format) {
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
					if (logger && visBands[0] !== '#') {
						logger.warn("No bands are specified in the output parameter settings. The first band will be used for a gray-value visualisation.");
					}
				}
				logger.info("Output CRS is " + crs);
				return new Promise((resolve, reject) => {
					dataCube.image().visualize({min: 0, max: 255, bands: visBands, palette: visPalette}).getThumbURL({
						format: format === 'jpeg' ? 'jpg' : format,
						dimensions: parameters.size || 1000,
						region: region,
						crs: crs
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
			case 'gtiff-thumb':
				return new Promise((resolve, reject) => {
					dataCube.image().getThumbURL({
						format: 'geotiff',
						dimensions: parameters.size || 1000,
						region: region,
						crs: crs
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
			case 'gtiff-zip':
				return new Promise((resolve, reject) => {
					dataCube.image().getDownloadURL({
						dimensions: parameters.size || 1000,
						region: region,
						crs: crs
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

	getExtension(format) {
		format = format.toLowerCase();
		switch(format) {
			case 'jpeg':
				return 'jpg';
			case 'gtiff-thumb':
				return 'tif';
			case 'gtiff-zip':
				return 'zip';
			default:
				return format;
		}
	}

}
