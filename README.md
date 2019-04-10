# openeo-earthengine-driver
openEO back-end driver for [Google Earth Engine](https://earthengine.google.com/).

This back-end currently supports **openEO API version 0.3.1**. Legacy versions are available as releases.

## Demo

* The most recent instance (openEO API v0.3.1) is running at https://earthengine.openeo.org/v0.3
* You can connect to it using any openEO client, e.g. the Web Editor: https://editor.openeo.org/?server=https%3A%2F%2Fearthengine.openeo.org%2Fv0.3

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

**[Further documentation](docs/README.md) can be found in the [docs/](docs/) directory, but is currently work in progress.**
