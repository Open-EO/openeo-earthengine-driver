const Datastore = require('nedb');
const crypto = require("crypto");
const objectHash = require('object-hash');
const fse = require('fs-extra');
const path = require('path');
const axios = require('axios');
const Errors = require('./errors');
const { Utils: CommonUtils } = require('@openeo/js-commons');

var Utils = {

	serverUrl: null,
	apiPath: null,

	tropicalSeasons() {
		return {
			ndjfma: ee.List([-1, 0, 1, 2, 3, 4]),
			mjjaso: ee.List([5, 6, 7, 8, 9, 10])
		};
	},

	seasons() {
		return {
			djf: ee.List([0, 1, 2]),
			mam: ee.List([3, 4, 5]),
			jja: ee.List([6, 7, 8]),
			son: ee.List([9, 10, 11])
		};
	},

	sequence(min, max) {
		var list = [];
		for(var i = min; i <= max; i++) {
			list.push(i);
		}
		return list;
	},

	getApiUrl(path = '') {
		if (this.serverUrl === null || this.apiPath === null) {
			console.warn('Server has not started yet, Utils.getApiUrl() is not available yet.');
		}
		return this.serverUrl + this.apiPath + path;
	},

	getServerUrl() {
		if (this.serverUrl === null || this.apiPath === null) {
			console.warn('Server has not started yet, Utils.getServerUrl() is not available yet.');
		}
		return this.serverUrl;
	},

	toISODate(timestamp) {
		return (new Date(timestamp)).toISOString();
	},
	
	encodeQueryParams(data) {
		let ret = [];
		for (let d in data) {
			ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
		}
		return ret.join('&');
	},

	isObject(obj) {
		return CommonUtils.isObject(obj);
	},
	
	size(obj) {
		return CommonUtils.size(obj);
	},

	loadDB(name) {
		var db = new Datastore({ filename: './storage/database/' + name + '.db', autoload: true });
		db.persistence.setAutocompactionInterval(60 * 60 * 1000); // Once every hour
		return db;
	},

	generateHash(length = 16) {
		return crypto.randomBytes(Math.ceil(length/2)).toString('hex').slice(0,length);
	},

	hashJSON(json) {
		return objectHash.sha1(json);
	},

	getTimestamp() {
		return Math.floor(Date.now() / 1000);
	},

	getISODateTime(datetime = null) {
		if (datetime === null) {
			datetime = new Date();
		}
		else if (typeof datetime === 'string' || typeof datetime === 'number') {
			datetime = new Date(datetime);
		}
		if (datetime instanceof Date) {
			datetime = datetime.toISOString();
		}
		return datetime.replace(/\.\d{3}/, ''); // Remove milliseconds
	},

	bboxToGeoJson(bbox) {
		return {
			geodesic: false,
			type: 'Polygon',
			coordinates:
				[ [ [ bbox.west, bbox.south ],
					[ bbox.east, bbox.south ],
					[ bbox.east, bbox.north ],
					[ bbox.west, bbox.north ],
					[ bbox.west, bbox.south ] ] ]
		};
	},

	geoJsonBbox(geojson) {
		var getCoordinatesDump = function(gj) {
			switch(gj.type) {
				case 'Point':
					return [gj.coordinates];
				case 'MultiPoint':
				case 'LineString':
					return gj.coordinates;
				case 'MultiLineString':
				case 'Polygon':
					return gj.coordinates.reduce(function(dump,part) {
						return dump.concat(part);
					}, []);
				case 'MultiPolygon':
					return gj.coordinates.reduce(function(dump,poly) {
						return dump.concat(poly.reduce(function(points,part) {
							return points.concat(part);
						},[]));
					},[]);
				case 'GeometryCollection':
					return gj.geometries.reduce(function(dump,g) {
						return dump.concat(getCoordinatesDump(g));
					},[]);
				case 'Feature':
					return getCoordinatesDump(gj.geometry);
				case 'FeatureCollection':
					return gj.features.reduce(function(dump,f) {
						return dump.concat(getCoordinatesDump(f));
					},[]);
				default:
					throw new Error("Invalid GeoJSON type.");
			}
		};
		var coords = getCoordinatesDump(geojson);
		var bbox = [Number.POSITIVE_INFINITY,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY,Number.NEGATIVE_INFINITY];
		return coords.reduce(function(prev,coord) {
			return [
				Math.min(coord[0], prev[0]),
				Math.min(coord[1], prev[1]),
				Math.max(coord[0], prev[2]),
				Math.max(coord[1], prev[3])
			];
		}, bbox);
	},

	geoJsonToGeometry(geojson) {
		switch(geojson.type) {
			case 'Feature':
				return ee.Geometry(geojson.geometry);
			case 'FeatureCollection':
				var geometries = {
					type: "GeometryCollection",
					geometries: []
				};
				for(var i in geojson.features) {
					geometries.geometries.push(geojson.features[i].geometry);
				}
				return ee.Geometry(geometries);
			case 'Point':
			case 'MultiPoint':
			case 'LineString':
			case 'MultiLineString':
			case 'Polygon':
			case 'MultiPolygon':
			case 'GeometryCollection':
				return ee.Geometry(geojson);
			default:
				return null;
		}

	},

	geoJsonToFeatureCollection(geojson) {
		switch(geojson.type) {
			case 'Point':
			case 'MultiPoint':
			case 'LineString':
			case 'MultiLineString':
			case 'Polygon':
			case 'MultiPolygon':
			case 'GeometryCollection':
			case 'Feature':
				return ee.FeatureCollection(ee.Feature(geojson));
			case 'FeatureCollection':
				var features = [];
				for(var i in geojson.features) {
					features.push(ee.Feature(geojson.features[i]));
				}
				return ee.FeatureCollection(features);
			default:
				return null;
		}
	},

	getFileExtension(file) {
		return file.split('.').pop();
	},

	extensionToMediaType(ext) {
		ext = this.getFileExtension(ext);
		switch(ext.toLowerCase()) {
			case 'png':
				return 'image/png';
			case 'jpg':
			case 'jpeg':
				return 'image/jpeg';
			case 'json':
				return 'application/json';
			default:
				return 'application/octet-stream';
		}
	},

	walk(dir) {
		return fse.readdir(dir).then(files => {
			return Promise.all(files.map(file => {
				const filepath = path.join(dir, file);
				return fse.stat(filepath).then(stats => {
					if (stats.isDirectory()) {
						return this.walk(filepath);
					}
					else if (stats.isFile()) {
						return Promise.resolve({
							path: filepath,
							stat: stats
						});
					}
				});
			}))
			.then((foldersContents) => {
				return Promise.resolve(foldersContents.reduce((all, folderContents) => all.concat(folderContents), []));
			});
		});
	},

	isFile(path) {
		return fse.stat(path).then(stat => {
			if (stat.isFile()) {
				return Promise.resolve();
			}
			else {
				return Promise.reject(new Errors.FileOperationUnsupported());
			}
		})
		.catch(err => {
			return Promise.reject(new Errors.FileNotFound());
		});
	},

	stream(opts) {
		return axios(opts).catch(error => {
			if (opts.responseType === 'stream' && error.response !== null && typeof error.response === 'object' && error.response.data !== null) {
				// JSON error responses are Blobs and streams if responseType is set as such, so convert to JSON if required.
				// See: https://github.com/axios/axios/issues/815
				return new Promise((_, reject) => {
					var chunks = [];
					error.response.data.on("data", chunk => chunks.push(chunk));
					error.response.data.on("error", () => reject(error));
					error.response.data.on("end", () => reject(new Errors.EarthEngineError({
						message: Buffer.concat(chunks).toString(),
						process: 'save_result'
					})));
				});
			}
			throw error;
		});

	}

};

module.exports = Utils;
