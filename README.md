# openeo-earthengine-driver

openEO back-end driver for [Google Earth Engine](https://earthengine.google.com/).

This back-end implements **openEO API version 1.2.0**.

> [!NOTE]
> This is not a production-ready implementation yet!

If you are interested in using openEO together with Google Earth Engine, [express your interest with the Google Earth Engine Team](https://developers.google.com/earth-engine/help#feature_requests), please.

## Demo

The demo instance is running at <https://earthengine.openeo.org>

To log in, you can use your Google Account to authenticate as long as it's signed up for Google Earth Engine.
As a non-commercial user, you can [register for Google Earth Engine](https://signup.earthengine.google.com/) for free.

If you are unable to register for Google Earth Engine, we can also provide a demo account.
Please contact [openeo.psc@uni-muenster.de](mailto:openeo.psc@uni-muenster.de).

## Setting up an instance

The driver is written in [node.js](https://nodejs.org/) and requires at least version 20.0.0.
Install node.js and npm according to the official documentation of each software package.

Afterwards either download the files in this repository or clone it. Run `npm install` to install the dependencies

### Configuration

There are several important configuration options in the file [config.json](config.json):

* `hostname`: The address of the server running the openEO GEE driver. For local deployments usually `127.0.0.1`, for public instances the ip or domain name of the server, e.g. `earthengine.openeo.org`.
* `port`: The port the HTTP instance of the openEO GEE driver is running on.
* `ssl`: Configuration to enable HTTPS (secured HTTP with SSL).
    * `port`: The port the HTTPS (secured) instance of the openEO GEE driver is running on.
    * `key`: If you want to create an HTTPS server, pass in a private key. Otherwise set to `null`.
    * `certificate`: If you want to create an HTTPS server, pass in a PEM-encoded certificate. Otherwise set to `null`.

#### Setting up GEE authentication

Generally, information about authentication with Google Earth Engine can be found in the [Earth Engine documentation](https://developers.google.com/earth-engine/app_engine_intro).

##### Service Account

If you want to run all processing through a single account you can use service accounts. That's the most reliable way right now.
The server needs to authenticate with a [service accounts](https://developers.google.com/earth-engine/service_account) using a private key. The account need to have access rights for earth engine. You need to drop your private key file into a secure place specify the file path of the private key in the property `serviceAccountCredentialsFile` in the file [config.json](config.json).

##### Google User Accounts

> [!CAUTION]
> This authentication method currently requires you to login every 60 minutes unless the openEO clients refresh the tokens automatically.
> User workspaces also don't work reliably as of now.

Alternatively, you can configure the driver to let users authenticatie with their User Accounts via OAuth2 / OpenID Connect.
For this you need to configure the property `googleAuthClients` in the file [config.json](config.json).

You want to have at least client IDs for "Web Application" from the
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
  }
]
```

### Starting up the server

After configuration, the server can be started. Run `npm run up` to start the server.

After finishing work, you can stop the server by running `npm run down`.

You can add a new user account by running `npm run adduser`.

## Usage

For both the demo servers or your own instance you can use the [openEO API](https://open-eo.github.io/openeo-api/apireference/index.html) to communicate with Google Earth Engine.

There are various clients for the openEO API, e.g.
- Web Editor
- Python
- R
- JavaScript
- Julia

There are various process graph examples in the following folder: [examples](./examples/)

> [!WARNING]
> Google Earth Engine internally works quite different compared to openEO.
> The process implementations may slightly differ from the openEO process descriptions in some cases.
> For example, the handling of no-data, NaN and infinity values works differently.
> Be aware that in some cases the results may slightly differ when compared to other openEO implementations.

Other known issues:
- Ideally, all comutations - including the datacube management - run on GEE's side.
  Currently, some smaller checks still run in the proxy implementation due to the issue that we can't easily abort execution on GEE in case we identify anomalies or other issues.
