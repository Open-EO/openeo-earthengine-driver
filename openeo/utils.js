const Datastore = require('nedb');
const crypto = require("crypto");
const fs = require('fs');
const path = require('path');
const objectHash = require('object-hash');
const Errors = require('./errors');

var Utils = {

	serverUrl: null,

	getApiUrl(path) {
		if (this.serverUrl === null) {
			console.log('WARN: Server has not started yet, Utils.getApiUrl() is not available yet.');
		}
		return this.serverUrl + path;
	},

	getServerUrl() {
		if (this.serverUrl === null) {
			console.log('WARN: Server has not started yet, Utils.getServerUrl() is not available yet.');
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
	
	size(obj) {
		return Object.keys(obj).length;
	},

	loadDB(name) {
		var db = new Datastore({ filename: './storage/database/' + name + '.db', autoload: true });
		db.persistence.setAutocompactionInterval(60 * 60 * 1000); // Once every hour
		return db;
	},

	generateHash(length = 16) {
		return crypto.randomBytes(Math.ceil(length/2)).toString('hex').slice(0,length);
	},

	encryptPassword(password){
		return this.hashPassword(password, this.generateHash(16));
	},

	hashPassword(password, salt){
		var hash = crypto.createHmac('sha512', salt);
		hash.update(password);
		return {
			salt: salt,
			passwordHash: hash.digest('hex')
		};
	},

	hashJSON(json) {
		return objectHash.sha1(json);
	},

	getTimestamp() {
		return Math.floor(Date.now() / 1000);
	},

	getISODateTime() {
		return (new Date()).toISOString().replace(/\.\d{3}/, '');
	},

	geoJsonToFeatureCollection(geojson) {
		let feature = null;
		switch(geojson.type) {
			case 'Point':
			case 'MultiPoint':
			case 'LineString':
			case 'MultiLineString':
			case 'Polygon':
			case 'MultiPolygon':
			case 'GeometryCollection':
			case 'Feature':
				feature = ee.FeatureCollection(ee.Feature(geojson));
				break;
			case 'FeatureCollection':
				var features = [];
				for(var i in geojson.features) {
					features.push(ee.Feature(geojson.features[i]));
				}
				feature = ee.FeatureCollection(features);
				break;
		}
		return feature;
	},

	mkdirSyncRecursive(targetDir, isRelativeToScript = false) {
		const sep = path.sep;
		const initDir = path.isAbsolute(targetDir) ? sep : '';
		const baseDir = isRelativeToScript ? __dirname : '.';

		targetDir.split(sep).reduce((parentDir, childDir) => {
			const curDir = path.resolve(baseDir, parentDir, childDir);
			try {
				fs.mkdirSync(curDir);
			} catch (err) {
				if (err.code !== 'EEXIST') {
					throw err;
				}
			}
			return curDir;
		}, initDir);
	}

};

module.exports = Utils;
