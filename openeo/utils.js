const Datastore = require('nedb');
const crypto = require("crypto");
const fs = require('fs');
const path = require('path');

var Utils = {

	serverUrl: null,

	toISODate(timestamp) {
		return (new Date(timestamp)).toISOString().substr(0, 10);
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
		return new Datastore({ filename: './storage/' + name + '.db', autoload: true });
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
