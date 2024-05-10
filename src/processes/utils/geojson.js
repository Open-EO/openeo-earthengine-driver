const GeeGeoJsonUtils = {

  toGeometry(node, geojson) {
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

  toFeatureCollection(node, geojson) {
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

export default GeeGeoJsonUtils;
