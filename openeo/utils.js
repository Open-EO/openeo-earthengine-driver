const Datastore = require('nedb');
const crypto = require("crypto");

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

	convertZonalStatistics(feature, propertyName) {
		if (feature.type !== 'Feature') {
			return null;
		}

		var data = {
			"geometry": feature.geometry,
			"results": []
		};

		data.results.push({
			"totalCount": null,
			"validCount": null,
			"value": feature.properties[propertyName]
		});

		return data;
	},

	geoJsonToGeometries(geojson) {
		// Properties are ignored for non-features
		let geometry = null;
		switch(geojson.type) {
			case 'Point':
				geometry = ee.Geometry.Point(geojson.coordinates);
				break;
			case 'MultiPoint':
				geometry = ee.Geometry.MultiPoint(geojson.coordinates);
				break;
			case 'LineString':
				geometry = ee.Geometry.LineString(geojson.coordinates);
				break;
			case 'MultiLineString':
				geometry = ee.Geometry.MultiLineString(geojson.coordinates);
				break;
			case 'Polygon':
				geometry = ee.Geometry.Polygon(geojson.coordinates);
				break;
			case 'MultiPolygon':
				geometry = ee.Geometry.MultiPolygon(geojson.coordinates);
				break;
			case 'GeometryCollection':
				var geometries = [];
				for(var i in geojson.geometries) {
					geometries.push(this.geoJsonToGeometries(geojson.geometries[i]));
				}
				geometry = ee.Geometry.MultiGeometry(geometries);
				break;
			case 'Feature':
				geometry = ee.Feature(this.geoJsonToGeometries(geojson.geometry), geojson.properties);
				break;
			case 'FeatureCollection':
				var features = [];
				for(var i in geojson.features) {
					features.push(this.geoJsonToGeometries(geojson.features[i]));
				}
				geometry = ee.FeatureCollection(features);
				break;
		}
		return geometry;
	}

};

module.exports = Utils;
