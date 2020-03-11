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
	async retrieveResults(dataCube, bbox = null, resourceId = null) {
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
			case 'gtiff':
				if (!resourceId) {
					throw new Errors.GeoTiffUnsupportedForSync();
				}

				var imgCollection = dataCube.imageCollection();
				var list = imgCollection.toList(imgCollection.size());
				var imgCount = 1;//await Utils.promisify(list.size(), 'getInfo');
				var taskIds = await Utils.promisify(callback => ee.data.newTaskId(imgCount, callback));
				try {
					for (var i = 0; i < imgCount; i++) {
						var img = ee.Image(list.get(i));
						var imgId = await Utils.promisify(img.id(), 'getInfo');
						var exportId = resourceId + "_" + imgId;
						var opts = {
							type: 'EXPORT_IMAGE', // remove for Export.toDrive
							element: img, // Key is 'image' for Export.toDrive
							description: exportId,
							scale: !parameters.size ? (parameters.scale || 1000) : undefined,
							dimensions: parameters.size ? parameters.size : undefined,
							driveFolder: exportId, // Key is 'folder' for Export.toDrive
							driveFileNamePrefix: exportId, // Key is 'filenamePrefix' for Export.toDrive
							region: region,
							crs: Utils.crsToString(bbox.crs),
							fileFormat: 'GeoTiff',
							formatOptions: {
								cloudOptimized: typeof parameters.cloudOptimized === 'boolean' ? parameters.cloudOptimized : true
							}
						};

						var res = await Utils.promisify(callback => ee.data.startProcessing(taskIds[i], opts, callback));
						taskIds[i] = res.taskId; // See issue https://issuetracker.google.com/issues/143007814, may later be removed nd replaced with taskId
					}

					// Start monitoring
					// ToDo: Error handling
					var urls = [];
					var completed = 0;
					await new Promise((resolve, reject) => {
						var timer = setInterval(async () => {
							try {
								var statusList = await Utils.promisify(callback => ee.data.getTaskStatus(taskIds, callback));
								if (!Array.isArray()) {
									statusList = [statusList];
								}
								for(var info of statusList) {
									switch(info.state) {
										case 'COMPLETED':
											if (completed === statusList.length) {
												clearInterval(timer);
											}
											completed++;
											var drive = this.serverContext.drive();
											await drive.publish(info.output_url);
											urls.push(info.output_url);
											if (completed === statusList.length) {
												resolve();
											}
											break;
										case 'FAILED':
										case 'CANCELLED':
										case 'CANCEL_REQUESTED':
											clearInterval(timer);
											reject("Task " + info.id + " failed");
											break;
										default: // READY, RUNNING...
											console.log(info);
									}
								}
							} catch (e) {
								clearInterval(timer);
								reject(e);
							}
						}, 10000);
					});
					return urls;
				} catch (e) {
					for(var taskId of taskIds) {
						ee.data.cancelTask(taskId, () => {});
					}
					throw e;
				}
			case 'jpeg':
			case 'png':
				return new Promise((resolve, reject) => {
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

					dataCube.image().visualize({min: 0, max: 255, bands: visBands, palette: visPalette}).getThumbURL({
						format: this.translateOutputFormat(format),
						dimensions: parameters.size || 2000,
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
							resolve([url]);
						}
					});
				});
			case 'json':
				if (!resourceId) {
					resourceId = Math.random().toString(36).substr(2, 9);
				}
				var fileName = Utils.generateHash() + "/result-" + resourceId +  ".json";
				var p = path.normalize(path.join(this.serverContext.getTempFolder(), fileName));
				var parent = path.dirname(p);
				await fse.ensureDir(parent);
				await fse.writeJson(p, dataCube.getData());
				return [Utils.getApiUrl("/temp/" + fileName)];
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