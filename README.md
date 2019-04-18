# openeo-earthengine-driver
openEO back-end driver for [Google Earth Engine](https://earthengine.google.com/).

This back-end currently supports **openEO API version 0.3.1**, version 0.4.0 is currently in development.
Legacy versions are available as releases.

## Demo

* The most recent version (openEO API v0.3.1) is running at https://earthengine.openeo.org/v0.3
* The development version (openEO API v0.4.0) is running at https://earthengine.openeo.org/v0.4

Multiple user accounts are available to be used (`group1`, `group2`, ... until `group15`), each with password `test123`.

## Setting up an instance

The driver is written in [node.js](https://nodejs.org/) and requires at least version 11.0.0. Install node.js and npm according to the official documentation of each software package. Often node.js is shipped together with npm.

Afterwards either download the files in this repository or clone it. Run `npm install` to install the dependencies

### Configuration

There are several important configuration options in the file [config.json](config.json):

* `hostname`: The address of the server running the openEO GEE driver. For local deployments usually `127.0.0.1`, for public instances the ip or domain name of the server, e.g. `earthengine.openeo.org`.
* `port`: The port the HTTP instance of the openEO GEE driver is running on.
* `ssl`: Configuration to enable HTTPS (secured HTTP with SSL).
    * `port`: The port the HTTPS (secured) instance of the openEO GEE driver is running on.
    * `key`: If you want to create an HTTPS server, pass in a private key. Otherwise set to `null`.
    * `certificate`: If you want to create an HTTPS server, pass in a PEM-encoded certificate. Otherwise set to `null`.
* `serviceAccountCredentialsFile`: See section 'Setting up GEE authentication'.

#### Setting up GEE authentication

The server needs to authenticate with a [service accounts](https://developers.google.com/earth-engine/service_account) using a private key. The account need to have access rights for earth engine. You need to drop your private key file into a secure place specify the file path of the private key in the property `serviceAccountCredentialsFile` in the file [config.json](config.json).

More information about authentication can be found in the [Earth Engine documentation](https://developers.google.com/earth-engine/app_engine_intro).

### Starting up the server

After configuration, the server can be started. Run  `npm run start` to start the server. 

## Usage

For both the demo servers or your own instance you can use the [openEO API](https://open-eo.github.io/openeo-api/apireference/index.html) to communicate with Google Earth Engine.

An exemplary process graph to create an on-demand XYZ web-service looks like this: 

```
{
  "load_collection": {
    "arguments": {
      "id": "COPERNICUS/S2",
      "spatial_extent": {"west": 4.96871, "south": 51.807693, "east": 5.726767, "north": 52.535366},
      "temporal_extent": ["2018-04-30","2018-06-26"]
    },
    "process_id": "load_collection"
  },
  "b1": {
    "arguments": {
      "data": {"from_node": "load_collection"},
      "bands": ["B4"]
    },
    "process_id": "filter_bands"
  },
  "b2": {
    "arguments": {
      "data": {"from_node": "load_collection"},
      "bands": ["B8"]
    },
    "process_id": "filter_bands"
  },
  "normalized_difference": {
    "arguments": {
      "band1": {"from_node": "b1"},
      "band2": {"from_node": "b2"}
    },
    "process_id": "normalized_difference"
  },
  "reduce": {
    "arguments": {
      "data": {"from_node": "normalized_difference"},
      "dimension": "temporal",
      "reducer": {
        "callback": {
          "min": {
            "arguments": {
              "data": {"from_argument": "data"}
            },
            "process_id": "min",
            "result": true
          }
        }
      }
    },
    "process_id": "reduce"
  },
  "save_result": {
    "arguments": {
      "data": {"from_node": "reduce"},
      "format": "png"
    },
    "process_id": "save_result",
    "result": true
  }
}
```

This translates into the following [Google Earth Engine Playground](https://code.earthengine.google.com/) script:

```
// load_collection
var img = ee.ImageCollection("COPERNICUS/S2");
img = img.filterDate("2018-04-30", "2018-06-26");
var geom = ee.Geometry.Rectangle([4.96871,51.807693,5.726767,52.535366], "EPSG:4326");
img = img.filterBounds(geom);

// filter_bands (2x)
var band1 = img.select(["B4"],["B4"]);
var band2 = img.select(["B8"],["B8"]);

// normalized_difference
var combined = band1.combine(band2);
img = combined.map(function(image) {
	var normalizedDifference = image.normalizedDifference().rename("normalized_difference");
	return image.addBands(normalizedDifference).select("normalized_difference");
});

// reduce with callback min
img = img.reduce('min');

// save_result
// Either download data with img.getDownloadURL() or show it in in the playground with:
Map.addLayer(img);
```

**[Further documentation](docs/README.md) can be found in the [docs/](docs/) directory, but is currently work in progress.**