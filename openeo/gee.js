// This is inspired from ee-runnter, https://github.com/gee-community/ee-runner/blob/master/authenticate.js

const fs = require('fs');
const axios = require('axios');
const path = require('path');
require("google-closure-library");
const { google } = require('googleapis');
const Utils = require('./utils');
global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest; // Make XMLHttpRequest available in node for the ee client

// include GEE sources
require('../earthengine-api/javascript/src/encodable');
require('../earthengine-api/javascript/src/serializer');
require('../earthengine-api/javascript/src/data');
require('../earthengine-api/javascript/src/computedobject');
require('../earthengine-api/javascript/src/arguments');
require('../earthengine-api/javascript/src/types');
require('../earthengine-api/javascript/src/function');
require('../earthengine-api/javascript/src/apifunction');
require('../earthengine-api/javascript/src/element');
require('../earthengine-api/javascript/src/filter');
require('../earthengine-api/javascript/src/collection');
require('../earthengine-api/javascript/src/number');
require('../earthengine-api/javascript/src/string');
require('../earthengine-api/javascript/src/date');
require('../earthengine-api/javascript/src/list');
require('../earthengine-api/javascript/src/dictionary');
require('../earthengine-api/javascript/src/geometry');
require('../earthengine-api/javascript/src/feature');
require('../earthengine-api/javascript/src/customfunction');
require('../earthengine-api/javascript/src/featurecollection');
require('../earthengine-api/javascript/src/image');
require('../earthengine-api/javascript/src/imagecollection');
require('../earthengine-api/javascript/src/terrain');
require('../earthengine-api/javascript/src/ee');


const eeAuthenticator = {
	
	authFile: path.join(__dirname, '../storage/gee-auth.json'),
	authInfo: null,
	refreshTokenFile: path.join(__dirname, '../storage/gee-token'),
	
	// ToDo: Migrate to authenticateViaPrivateKey?
	withConsole(onsuccess, onerror, openBrowser = false) {
		this.authInfo = JSON.parse(fs.readFileSync(this.authFile, 'utf8'));

		// generate refresh token
		const refreshToken = this.getRefreshToken();
		if (refreshToken === null) {
			var params = {
				'scope': 'https://www.googleapis.com/auth/earthengine.readonly',
				'redirect_uri': this.authInfo.redirect_uri,
				'response_type': 'code',
				'client_id': this.authInfo.client_id
			};

			var uri = 'https://accounts.google.com/o/oauth2/auth?' + Utils.encodeQueryParams(params);

			console.log("Visit the following URL to get an authorization code:");
			console.log(uri);
			console.log();

			console.log('Please enter authorization code: ');

			var done = false;
			this._readKey((auth_code) => {
				if (done) {
					return;
				}
				done = true;

				// request refresh token
				params = {
					'code': auth_code,
					'client_id': this.authInfo.client_id,
					'client_secret': this.authInfo.client_secret,
					'redirect_uri': this.authInfo.redirect_uri,
					'grant_type': 'authorization_code'
				};

				var options = {
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					}
				};
				axios.post('https://accounts.google.com/o/oauth2/token', Utils.encodeQueryParams(params), options)
					.then(res => {
						if (!res.data.refresh_token) {
							throw "No refresh token found in response.";
						}
						const token = res.data.refresh_token;
						fs.writeFileSync(this.refreshTokenFile, token, 'utf8');
						this.withToken(token, onsuccess, onerror);
					}).catch(error => {
						onerror(error);
					});
			});
		} else {
			this.withToken(refreshToken, onsuccess, onerror);
		}
	},
	
	withToken(refreshToken, onsuccess, onerror) {
		var client = new google.auth.OAuth2(this.authInfo.client_id, this.authInfo.client_secret, this.authInfo.redirect_uri);
		client.setCredentials({refresh_token: refreshToken});
		client.refreshAccessToken((err, tokens) => {
			if (err) {
				throw err;
			}
			ee.data.authToken_ = 'Bearer ' + tokens.access_token;
			ee.data.authClientId_ = this.authInfo.client_id;
			ee.data.authScopes_ = [ee.data.AUTH_SCOPE_];
			ee.initialize(ee.data.DEFAULT_API_BASE_URL_, null, onsuccess, onerror);
		});
	},
	
	getRefreshToken() {
		// check if refresh token exists
		if (fs.existsSync(this.refreshTokenFile)) {
			var token = fs.readFileSync(this.refreshTokenFile, 'utf8');
			if (token.trim().length > 0) {
				return token;
			}
		}
		return null;
	},
	
	_readKey (callback) {
		process.stdin.setEncoding('utf8');
		process.stdin.on('readable', () => {
			var chunk = process.stdin.read();
			if (chunk !== null) {
				callback(chunk);
			}
		});
		process.stdin.on('end', () => {});
	}
	
};

module.exports = {
	eeAuthenticator
};