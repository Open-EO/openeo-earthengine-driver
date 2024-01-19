const GeeUtils = {

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
	},

};

export default GeeUtils;
