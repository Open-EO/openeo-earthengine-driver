import Utils from '../utils/utils.js';
import HttpUtils from '../utils/http.js';
import Errors from '../utils/errors.js';
import StringStream from '../utils/stringstream.js';

export default class ProcessingContext {

	constructor(serverContext, user) {
		this.serverContext = serverContext;
		this.user = user;
		this.userId = user._id;
		this.ee = Utils.require('@google/earthengine');
	}

	async connectGee() {
		const user = this.getUser();
		const ee = this.ee;
		if (this.userId.startsWith("google-")) {
			console.log("Authenticate via user token");
			const expires = 59 * 60;
			// todo: get expiration from token and set more parameters
			ee.apiclient.setAuthToken(null, 'Bearer', user.token, expires, [], null, false, false);
		}
		else {
			console.log("Authenticate via private key");
			await new Promise((resolve, reject) => {
				ee.data.authenticateViaPrivateKey(
					this.serverContext.geePrivateKey,
					() => resolve(),
					error => reject("ERROR: GEE Authentication failed: " + error.message)
				);
			});
		}
		await ee.initialize();
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
		const p = this.workspace.getPath(this.userId, file);
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

	getUser() {
		return this.user;
	}

	// Returns AxiosResponse (object) or URL (string)
	async retrieveResults(dataCube) {
		const logger = dataCube.getLogger();
		const parameters = dataCube.getOutputFormatParameters();
		let format = dataCube.getOutputFormat();
		if (typeof format === 'string') {
			format = format.toLowerCase();
		}
		else {
			format = 'png';
		}

		let region = null;
		let crs = null;
		if (dataCube.hasDimensionsXY()) {
			// Handle CRS + bbox settings
			if (!parameters.epsgCode && (format === 'jpeg' || format === 'png')) {
				dataCube.setCrs(4326);
			}
			else if (parameters.epsgCode > 0) {
				dataCube.setCrs(parameters.epsgCode);
			}
			region = Utils.bboxToGeoJson(dataCube.getSpatialExtent());
			crs = Utils.crsToString(dataCube.getCrs());
		}

		switch(format) {
			case 'jpeg':
			case 'png': {
				let visBands = null;
				let visPalette = null;
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
						namespace: "backend",
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
			}
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
			case 'json': {
				const data = dataCube.getData();
				if (typeof data === 'undefined') {
					throw new Errors.Internal({message: 'Computation did not lead to any results'});
				}
				const json = JSON.stringify(data);
				const stream = new StringStream(json);
				return HttpUtils.createResponse(stream, {'content-type': 'application/json'});
			}
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
