# openeo-earthengine-driver
openEO back-end driver for [Google Earth Engine](https://earthengine.google.com/).

This back-end currently supports **openEO API version 1.0.0**.
Legacy versions are available as [releases](https://github.com/Open-EO/openeo-earthengine-driver/releases).

This is a **proof-of-concept** and is not meant to be used in production!
If you are interested in using openEO together with Google Earth Engine, [express your interest with the Google Earth Engine Team](https://developers.google.com/earth-engine/help#feature_requests), please.

## Demo

The demo instance is running at https://earthengine.openeo.org (supporting openEO API versions 0.4 and 1.0)

Several user accounts are available to be used (`group1`, `group2`, ...), each with password `test123`.

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

Generally, information about authentication with Google Earth Engine can be found in the [Earth Engine documentation](https://developers.google.com/earth-engine/app_engine_intro).

##### Service Account

If you want to run all processing through a single account you can use service accounts. That's the most reliable way right now.
The server needs to authenticate with a [service accounts](https://developers.google.com/earth-engine/service_account) using a private key. The account need to have access rights for earth engine. You need to drop your private key file into a secure place specify the file path of the private key in the property `serviceAccountCredentialsFile` in the file [config.json](config.json).

##### Google User Accounts

**EXPERIMENTAL:** *This authentication method currently requires you to login every 60 minutes unless the
openEO clients refresh the tokens automatically. User workspaces also don't work reliably as of now.*

Alternatively, you can configure the driver to let users authenticatie with their User Accounts via OAuth2 / OpenID Connect.
For this you need to configure the property `googleAuthClients` in the file [config.json](config.json).

You want to have at least client IDs for (1) "Web Application" and (2) "TVs & limited-input devices" from the 
[Google Cloud Console](https://console.cloud.google.com/apis/credentials).

For example:

```json
[
  {
    "id": "1234567890-abcdefghijklmnop.apps.googleusercontent.com",
    "grant_types": [
      "implicit"
    ],
    "redirect_urls": [
      "https://editor.openeo.org/",
      "http://localhost/"
    ]
  },
  {
    "id": "0123456789-abcdefghijklmnop.apps.googleusercontent.com",
    "grant_types": [
      "urn:ietf:params:oauth:grant-type:device_code+pkce"
    ]
  }
]
```

### Starting up the server

After configuration, the server can be started. Run `npm run up` to start the server. 

After finishing work, you can stop the server by running `npm run down`.

You can add a new user account by running `npm run adduser`.

## Usage

For both the demo servers or your own instance you can use the [openEO API](https://open-eo.github.io/openeo-api/apireference/index.html) to communicate with Google Earth Engine.

An exemplary process to create an on-demand XYZ web-service looks like this: [sample-processgraph.json](tests/data/sample-processgraph.json)

This translates into the following [Google Earth Engine Playground](https://code.earthengine.google.com/) script:

```
// load_collection
var col = ee.ImageCollection("COPERNICUS/S2");
col = col.filterDate("2018-01-01", "2018-01-31");

// filter_bands (2x)
col = col.select(["B4", "B8"]);

// reduce over bands with callback normalized_difference
col = col.map(function(image) {
  var red = image.select("B4");
  var nir = image.select("B8");
	return nir.subtract(red).divide(nir.add(red));
});

// reduce over time with callback max
var img = col.reduce('max');

// save_result
// Either download data with img.getDownloadURL() or show it in in the playground with:
Map.addLayer(img);
```

**[Further documentation](docs/README.md) and more examples can be found in the [docs/](docs/) directory, but it is work in progress.**
