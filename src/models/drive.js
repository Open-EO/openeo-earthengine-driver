const { google } = require('googleapis');

module.exports = class Drive {

	constructor() {
		this.drive = null;
	}

	async connect(privateKey) {
		return new Promise((resolve, reject) => {
			const scopes = ['https://www.googleapis.com/auth/drive'];
			const auth = new google.auth.JWT(privateKey.client_email, null, privateKey.private_key, scopes);
			this.drive = google.drive({version: 'v3', auth});
			this.drive.files.list({}, (err, res) => {
				if (err) {
					console.error("ERROR: Access to Google Drive not possible: " + err);
					reject();
				}
				else {
					console.info("Google Drive Authentication succeeded, has " + res.data.files.length + " files.");
					resolve();
				}
			});
		});
	}

	// https://drive.google.com/#folders/1rqL0rZqBCvNS9ZhgiJmPGN72y9ZfS3Ly
	getIdFromUrl(url) {
		return url.substring(url.lastIndexOf('/') + 1);
	}

	async publishFolder(id) {
		if (id.startsWith('https://')) {
			id = this.getIdFromUrl(id);
		}
		var permission = {
			'type': 'anyone',
			'role': 'reader'
		};
		return new Promise((resolve, reject) => {
			this.drive.permissions.create({
				resource: permission,
				fileId: id,
				fields: 'id',
			}, (err, res) => {
				if (err) {
					reject(err);
				} else {
					resolve(res);
				}
			});
		});
	}

	/**
	 * Lists the names and IDs of up to 10 files.
	 */
	async downloadFolder() {
		this.drive.files.list({
			pageSize: 10,
			fields: 'nextPageToken, files(id, name)',
		}, (err, res) => {
			if (err) return console.log('The API returned an error: ' + err);
			const files = res.data.files;
			if (files.length) {
				console.log('Files:');
				files.map((file) => {
					console.log(`${file.name} (${file.id})`);
				});
			} else {
				console.log('No files found.');
			}
		});
	}
};