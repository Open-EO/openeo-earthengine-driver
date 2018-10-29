# openeo-earthengine-driver
Back-end driver for [Google Earth Engine](https://earthengine.google.com/).

## Configuration

There are several important configuration options in the file [config.json](config.json):

* `hostname`: The address of the server running the openEO GEE driver. For local deployments usually `127.0.0.1`, for public instances the ip or domain name of the server, e.g. `earthengine.openeo.org`.
* `port`: The port the HTTP instance of the openEO GEE driver is running on.
* `ssl`: Configuration to enable HTTPS (secured HTTP with SSL).
    * `port`: The port the HTTPS (secured) instance of the openEO GEE driver is running on.
    * `key`: If you want to create an HTTPS server, pass in a private key. Otherwise set to `null`.
    * `certificate`: If you want to create an HTTPS server, pass in a PEM-encoded certificate. Otherwise set to `null`.
* `serviceAccountCredentialsFile`: See section 'Setting up GEE authentication'.

### Setting up GEE authentication

The server needs to authenticate with a [service accounts](https://developers.google.com/earth-engine/service_account) using a private key. The account need to have access rights for earth engine. You need to drop your private key file into a secure place specify the file path of the private key in the property `serviceAccountCredentialsFile` in the file [config.json](config.json).

More information about authentication can be found in the [Earth Engine documentation](https://developers.google.com/earth-engine/app_engine_intro).

## Usage

After configuration, the server can be started. Run `npm install` to install the dependencies and  `npm run start` to start the server. 

Afterwards, you can use the [openEO API](https://open-eo.github.io/openeo-api/apireference/index.html) to communicate with Google Earth Engine.

Currently, use case 1 of the proof of concept is supported. An exemplary process graph to create an on-demand XYZ web-service looks like this: 

```
{
  "process_id": "stretch_colors",
  "imagery": {
    "process_id": "min_time",
    "imagery": {
      "process_id": "NDVI",
      "imagery": {
        "process_id": "filter_daterange",
        "imagery": {
          "process_id": "get_collection",
          "name": "COPERNICUS/S2"
        },
        "extent": [
          "2018-01-01T00:00:00Z",
          "2018-01-31T23:59:59Z"
        ]
      },
      "red": "B4",
      "nir": "B8"
    }
  },
  "min": -1,
  "max": 1
}
```

Alternatively, you can use the [openEO Web Editor](https://github.com/Open-EO/openeo-web-editor) to execute the same process graph:

```
// Example is outdated and needs to be adopted to the new JS client version.
OpenEO.Editor.ProcessGraph = OpenEO.ImageCollection.create("COPERNICUS/S2")
	.filter_daterange("2018-01-01T00:00:00Z", "2018-01-31T23:59:59Z")
	.NDVI("B4", "B8")
	.min_time()
	.process("stretch_colors", {min: -1, max: 1}, "imagery");
```

This translates into the following [Google Earth Engine Playground](https://code.earthengine.google.com/) script:

```
// create image collection
var img = ee.ImageCollection('COPERNICUS/S2');

// filter_daterange
img = img.filterDate("2018-01-01T00:00:00Z", "2018-01-31T23:59:59Z");

// ndvi
img = img.map(function(image) {
  return image.normalizedDifference(['B4', 'B8']);
});

// min_time
img = img.reduce('min');

// stretch_color and mapping
Map.addLayer(img, {min: -1, max: 1, palette: ['black', 'white']});
```
