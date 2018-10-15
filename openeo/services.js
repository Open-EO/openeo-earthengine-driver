const Utils = require('./utils');
const Jobs = require('./jobs');
const ProcessRegistry = require('./processRegistry');
const Errors = require('./errors');
const eeUtils = require('./eeUtils');

module.exports = class ServicesAPI {

	constructor() {
		this.db = Utils.loadDB('services');
	}

	beforeServerStart(server) {
		// Add endpoints
//		server.addEndpoint('post', '/services', this.postService.bind(this)); // ToDo
//		server.addEndpoint('get', '/services/{service_id}', this.getServiceById.bind(this)); // ToDo
//		server.addEndpoint('patch', '/services/{service_id}', this.patchServiceById.bind(this)); // ToDo
//		server.addEndpoint('delete', '/services/{service_id}', this.deleteServiceById.bind(this)); // ToDo
//		server.addEndpoint('get', '/users/{user_id}/services', this.getUserServices.bind(this)); // ToDo
//		server.addEndpoint('get', '/xyz/{service_id}/{z}/{x}/{y}', this.getXYZ.bind(this)); // ToDo

		return new Promise((resolve, reject) => resolve());
	}

	getXYZ(req, res, next) {
		var query = {
			// Tiles are always public!
			// user_id: req.user._id,
			_id: req.params.service_id
		};
		this.db.findOne(query, (err, service) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (service ===  null) {
				res.send(404);
				return next();
			}

			Jobs.findJobById(service.job_id)
				.then(job => {
					var z = new Number(req.params.z);
					var x = new Number(req.params.x);
					var y = new Number(req.params.y);
		
					// Execute graph
					try {
						var obj = ProcessRegistry.parseProcessGraph(job.process_graph, req, res);
						var image = eeUtils.toImage(obj, req, res);

						// Calculate tile bounds
						// see: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
						var nw_lng = this.tile2long(x, z);
						var nw_lat = this.tile2lat(y, z);
						var se_lng  = this.tile2long(x+1, z);
						var se_lat = this.tile2lat(y+1, z);
						var xMin = Math.min(nw_lng, se_lng);
						var xMax = Math.max(nw_lng, se_lng);
						var yMin = Math.min(nw_lat, se_lat);
						var yMax = Math.max(nw_lat, se_lat);
						var rect = ee.Geometry.Rectangle([xMin, yMin, xMax, yMax], 'EPSG:4326');
			
						// Download image
						// ToDo: Replace getThumbURL with getDownloadURL
						image.getThumbURL({
							format: 'jpeg',
							dimensions: '256x256',
							region: rect.bounds().getInfo()
						}, url => {
							if (!url) {
								console.log('WARN: Download URL from Google is empty.');
								res.send(404);
							}
							else {
								console.log("Downloading " + url);
								res.redirect(url, next);
							}
						});
					} catch(e) {
						return next(new Errors.Internal(e));
					}
				})
				.catch(e => {
					return next(e);
				});
		});
	}

	tile2long(x, z) {
		return (x / Math.pow(2,z) * 360 - 180);
	}

	tile2lat(y, z) {
		var n = Math.PI - (2*Math.PI*y) / Math.pow(2,z);
		return ((180 / Math.PI) * Math.atan( 0.5*(Math.exp(n)-Math.exp(-n)) ));
	}

	getUserServices(req, res, next) {
		var query = {
			user_id: req.user._id
		};
		this.db.find(query, {}, (err, services) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else {
				services = services.map(service => {
					return this.makeServiceResponse(service);
				});
				res.json(services);
				return next();
			}
		});
	}
	  
	deleteServiceById(req, res, next) {
		var query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		this.db.remove(query, {}, (err, numRemoved) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (numRemoved === 0) {
				res.send(404);
				return next();
			}
			else {
				res.send(200);
				return next();
			}
		});
	}

	patchServiceById(req, res, next) {
		if (typeof req.body.service_args !== 'object') {
			req.body.service_args = {};
		}
		var query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		this.db.update(query, { $set: { service_args: req.body.service_args } }, {}, function (err, numChanged) {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (numChanged === 0) {
				res.send(404);
				return next();
			}
			else {
				res.send(200);
				return next();
			}
		});
	}

	getServiceById(req, res, next) {
		var query = {
			_id: req.params.service_id,
			user_id: req.user._id
		};
		this.db.findOne(query, {}, (err, service) => {
			if (err) {
				return next(new Errors.Internal(err));
			}
			else if (service === null) {
				res.send(404);
				return next();
			}

			res.json(this.makeServiceResponse(service));
			return next();
		});
	}

	postService(req, res, next) {
		if (typeof req.body.service_type !== 'string' || !req.config.isValidServiceType(req.body.service_type)) {
			res.send(400, "Service type is not supported.");
			return next();
		}

		if (typeof req.body.job_id === 'undefined') {
			res.send(400, "Job ID is undefined");
			return next();
		}

		if (typeof req.body.service_args !== 'object') {
			req.body.service_args = {};
		}

		Jobs.findJobForUserById(req.body.job_id, req.user._id)
			.then(job => {
				var data = {
					service_type: req.body.service_type,
					service_args: req.body.service_args,
					job_id: req.body.job_id,
					user_id: req.user._id
				}
				this.db.insert(data, (err, service) => {
					if (err) {
						return next(new Errors.Internal(err));
					}
					else {
						res.json(this.makeServiceResponse(service));
						return next();
					}
				});
			})
			.catch(e => {
				return next(e);
			});
	}

	makeServiceResponse(service) {
		return {
			service_id: service._id,
			service_url: this.makeServiceUrl(service),
			service_type: service.service_type,
			service_args: service.service_args,
			job_id: service.job_id
		};
	}

	makeServiceUrl(service) {
		return Utils.getServerUrl() + '/' + service.service_type + '/' + service._id;
	}
	
};
