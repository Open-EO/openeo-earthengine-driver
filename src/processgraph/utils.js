const GeeUtils = {

	toList(ee, data, converter = null) {
		if (Array.isArray(data)) {
			if (typeof converter === 'function') {
				data = data.map(converter);
			}
			return ee.List(data);
		}
		else if (data instanceof ee.Array) {
			return data.toList();
		}
		else if (data instanceof ee.List) {
			return data;
		}
		else if (data instanceof ee.Dictionary) {
			return data.values();
		}

		return null;
	},

	toString(ee, data) {
		if (typeof data === 'boolean' || typeof data === 'number' || typeof data === 'string') {
			return ee.String(String(data));
		}
		else if (data instanceof ee.String) {
			return data;
		}
		else if (this.isEarthEngineType(data)) {
			return ee.String(data);
		}

		return null;
	},

	isEarthEngineType(ee, obj) {
		return obj instanceof ee.ComputedObject ||
			obj instanceof ee.Array ||
			obj instanceof ee.Blob ||
			obj instanceof ee.Date ||
			obj instanceof ee.DateRange ||
			obj instanceof ee.Dictionary ||
			obj instanceof ee.Feature ||
			obj instanceof ee.FeatureCollection ||
			obj instanceof ee.Geometry ||
			obj instanceof ee.Image ||
			obj instanceof ee.ImageCollection ||
			obj instanceof ee.List ||
			obj instanceof ee.Number ||
			obj instanceof ee.String;
	},

	tropicalSeasons(node) {
		const ee = node.ee;
		return {
			ndjfma: ee.List([-1, 0, 1, 2, 3, 4]),
			mjjaso: ee.List([5, 6, 7, 8, 9, 10])
		};
	},

	seasons(node) {
		const ee = node.ee;
		return {
			djf: ee.List([0, 1, 2]),
			mam: ee.List([3, 4, 5]),
			jja: ee.List([6, 7, 8]),
			son: ee.List([9, 10, 11])
		};
	},

	geoJsonToGeometry(node, geojson) {
		const ee = node.ee;
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

	geoJsonToFeatureCollection(node, geojson) {
		const ee = node.ee;
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
	}

};

export default GeeUtils;
