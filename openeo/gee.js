// This is inspired from ee-runnter, https://github.com/gee-community/ee-runner/blob/master/authenticate.js

const fs = require('fs');
const axios = require('axios');
const path = require('path');
require("google-closure-library");
const { google } = require('googleapis');
const Utils = require('./utils');
global.ee = require('@google/earthengine');

const eeAuthenticator = {
	
	authFile: path.join(__dirname, '../storage/gee-auth.json'),
	authInfo: null,
	refreshTokenFile: path.join(__dirname, '../storage/gee-oauth-token'),

	authenticate(onsuccess, onerror) {
		this.authInfo = require(this.authFile);
		if (this.authInfo.method == 'OAuth') {
			this.withOAuthFromConsole(onsuccess, onerror);
		}
		else if (this.authInfo.method == 'ServiceAccount') {
			this.withPrivateKey(onsuccess, onerror);
		}
		else {
			onerror("Specified authentication method in storage/gee-auth.json is invalid.");
		}
	},

	withPrivateKey(onsuccess, onerror) {
		const privateKey = require(path.join('../storage/', this.authInfo.ServiceAccount.privateKeyFile));
		ee.data.authenticateViaPrivateKey(privateKey, onsuccess, onerror);
	},

	withOAuthFromConsole(onsuccess, onerror) {
		// generate refresh token
		const refreshToken = this._getRefreshToken();
		if (refreshToken === null) {
			var params = {
				'scope': 'https://www.googleapis.com/auth/earthengine.readonly',
				'redirect_uri': this.authInfo.OAuth.redirectUri,
				'response_type': 'code',
				'client_id': this.authInfo.OAuth.clientId
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
					'client_id': this.authInfo.OAuth.clientId,
					'client_secret': this.authInfo.OAuth.clientSecret,
					'redirect_uri': this.authInfo.OAuth.redirectUri,
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
						this._withRefreshToken(token, onsuccess, onerror);
					}).catch(error => {
						onerror(error);
					});
			});
		} else {
			this._withRefreshToken(refreshToken, onsuccess, onerror);
		}
	},
	
	_withRefreshToken(refreshToken, onsuccess, onerror) {
		var client = new google.auth.OAuth2(this.authInfo.OAuth.clientId, this.authInfo.OAuth.clientSecret, this.authInfo.OAuth.redirectUri);
		client.setCredentials({refresh_token: refreshToken});
		client.refreshAccessToken((err, tokens) => {
			if (err) {
				throw err;
			}
			ee.data.authToken_ = 'Bearer ' + tokens.access_token;
			ee.data.authClientId_ = this.authInfo.OAuth.clientId;
			ee.data.authScopes_ = [ee.data.AUTH_SCOPE_];
			ee.initialize(ee.data.DEFAULT_API_BASE_URL_, null, onsuccess, onerror);
		});
	},
	
	_getRefreshToken() {
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