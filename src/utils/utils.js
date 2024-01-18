import crypto from "crypto";
import fse from 'fs-extra';
import path from 'path';
import { Utils as CommonUtils } from '@openeo/js-commons';
import proj4 from 'proj4';
import { createRequire } from "module";

const Utils = {

	crsBboxes: {},
	serverUrl: null,
	apiPath: null,

	require(file) {
		const require = createRequire(import.meta.url);
		return require(file);
	},

	noop(x) {
		return x;
	},

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
		const list = [];
		for(let i = min; i <= max; i++) {
			list.push(i);
		}
		return list;
	},

	getApiUrl(endpoint = '') {
		if (this.serverUrl === null || this.apiPath === null) {
			console.warn('Server has not started yet, Utils.getApiUrl() is not available yet.');
		}
		return this.serverUrl + this.apiPath + endpoint;
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
		const ret = [];
		for (const d in data) {
			ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
		}
		return ret.join('&');
	},

	isNumeric(num) {
		return CommonUtils.isNumeric(num);
	},

	isObject(obj) {
		return CommonUtils.isObject(obj);
	},

	size(obj) {
		return CommonUtils.size(obj);
	},

	omitFromObject(obj, omit) {
		return CommonUtils.omitFromObject(obj, omit);
	},

	pickFromObject(obj, pick) {
		return CommonUtils.pickFromObject(obj, pick);
	},

	generateHash(length = 16) {
		return crypto.randomBytes(Math.ceil(length/2)).toString('hex').slice(0,length);
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

	crsToString(crs, defaultCrs = null) {
		if (!crs) {
			crs = defaultCrs;
		}
		if (typeof crs === 'number') {
			return 'EPSG:' + crs;
		}
		return crs;
	},

	crsToNumber(crs) {
		if (typeof crs === 'number') {
			return crs;
		}
		if (typeof crs === 'string' && crs.startsWith('EPSG:')) {
			return parseInt(crs.substring(5), 10);
		}
		return null;
	},

	bboxToGeoJson(bbox) {
		const geom = {
			geodesic: false,
			type: 'Polygon',
			coordinates:
				[ [ [ bbox.west, bbox.south ],
					[ bbox.east, bbox.south ],
					[ bbox.east, bbox.north ],
					[ bbox.west, bbox.north ],
					[ bbox.west, bbox.south ] ] ]
		};
		if (bbox.crs) {
			geom.crs = {
				type: "name",
				properties: {
					name: this.crsToString(bbox.crs)
				}
			};
		}
		return geom;
	},

	geoJsonBbox(geojson) {
		const getCoordinatesDump = function(gj) {
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
		const coords = getCoordinatesDump(geojson);
		const bbox = coords.reduce(function(prev,coord) {
			return [
				Math.min(coord[0], prev[0]),
				Math.min(coord[1], prev[1]),
				Math.max(coord[0], prev[2]),
				Math.max(coord[1], prev[3])
			];
		}, [Number.POSITIVE_INFINITY,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY,Number.NEGATIVE_INFINITY]);
		return {
			west: bbox[0],
			south: bbox[1],
			east: bbox[2],
			north: bbox[3],
			crs: 4326
		}
	},

	geoJsonToGeometry(geojson) {
		switch(geojson.type) {
			case 'Feature':
				return ee.Geometry(geojson.geometry);
			case 'FeatureCollection': {
				const geometries = {
					type: "GeometryCollection",
					geometries: []
				};
				for(const i in geojson.features) {
					geometries.geometries.push(geojson.features[i].geometry);
				}
				return ee.Geometry(geometries);
			}
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
			case 'FeatureCollection': {
				const features = [];
				for(const i in geojson.features) {
					features.push(ee.Feature(geojson.features[i]));
				}
				return ee.FeatureCollection(features);
			}
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
			case 'tif':
			case 'tiff':
				return 'image/tiff; application=geotiff';
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

	timeId() {
		const t = process.hrtime();
		return String(t[0] * 1e9 + t[1]).padStart(27, '0');
	},

	proj(from, to, coords) {
		const fromCrs = this.crsToString(from);
		const toCrs = this.crsToString(to);
		if (fromCrs === toCrs) {
			return coords;
		}

		this.loadCrsDef(fromCrs);
		this.loadCrsDef(toCrs);

		const newCoords = proj4(fromCrs, toCrs, coords);
		if (newCoords.filter(n => !this.isNumeric(n)).length > 0) {
			throw new Error("CRS conversion from " + fromCrs + " to " + toCrs + " failed.");
		}
		return newCoords;
	},

	projExtent(extent, targetCrs) {
		extent.crs = extent.crs > 0 ? extent.crs : 4326;
		const p1 = this.proj(extent.crs, targetCrs, [extent.west, extent.south]);
		const p2 = this.proj(extent.crs, targetCrs, [extent.east, extent.north]);
		return {
			west: p1[0],
			south: p1[1],
			east: p2[0],
			north: p2[1],
			crs: this.crsToNumber(targetCrs)
		};
	},

	getCrsBBox(crs) {
		crs = this.crsToString(crs);
		if (!this.crsBboxes[crs]) {
			this.loadCrsDef(crs);
		}
		return this.crsBboxes[crs];
	},

	loadCrsDef(crs) {
		crs = this.crsToString(crs);
		if (proj4.defs(crs) && this.crsBboxes[crs]) {
			return; // CRS already available
		}
		if (typeof crs !== 'string' || !crs.startsWith('EPSG:')) {
			throw new Error("CRS " + crs + " not supported");
		}

		try {
			const epsgCode = this.crsToNumber(crs);
			const def = Utils.require('epsg-index/s/' + epsgCode + '.json');
			proj4.defs(crs, def.proj4);
			this.crsBboxes[crs] = def.bbox;
		} catch (error) {
			throw new Error("CRS " + crs + " not available for reprojection");
		}
	}

};

export default Utils;
