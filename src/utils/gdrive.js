import drive from '@googleapis/drive';
import { JWT } from 'googleapis-common';
import Utils from './utils.js';

export default class GDrive {

	static SCOPES = [
		//"https://www.googleapis.com/auth/drive.file",
		"https://www.googleapis.com/auth/drive"
	];

	static getFolderName(job) {
		return `gee-${job._id}`;
	}

	constructor(context, user) {
		this.drive = null;
		this.context = context;
		this.user = user;
	}

	async connect() {
		if (this.drive) {
			return;
		}

		let authType;
		const options = {
			version: 'v3'
		};
		if (Utils.isGoogleUser(this.user._id)) {
			authType = "user token";
			options.access_token = this.user.token;
			options.auth = this.context.apiKey;
		}
		else if (this.context.eePrivateKey) {
			authType = "private key";
			const client = this.context.eePrivateKey;
			options.auth = new JWT(client.client_email, null, client.private_key, GDrive.SCOPES);
		}
		else {
			throw new Error("No authentication method available, must have at least a private key configured.");
		}

		this.drive = drive.drive(options);
		// await this.drive.files.list({pageSize: 1});
		console.log(`Authenticated at Google Drive via ${authType}`);
	}

	// Get the ID from URL
	// https://drive.google.com/#folders/1rqL0rZqBCvNS9ZhgiJmPGN72y9ZfS3Ly
	// => 1rqL0rZqBCvNS9ZhgiJmPGN72y9ZfS3Ly is the ID
	getIdFromUrl(url) {
		const parsed = new URL(url);
		return parsed.hash.split('/').pop();
	}

	async publishFoldersByName(name) {
		const res = await this.drive.files.list({
			q: `mimeType = 'application/vnd.google-apps.folder' and name = '${name}'`,
		});
		const folders = res.data.files;
		if (folders.length === 0) {
			throw new Error(`Folder not found: ${name}`);
		}
		else {
			console.log(folders);
			const promises = folders.map(folder => this.publishFolder(folder.id));
			return Promise.all(promises);
		}
	}

	async publishFolder(id) {
		if (Utils.isUrl(id)) {
			id = this.getIdFromUrl(id);
		}
		return await this.drive.permissions.create({
			resource: {
				'type': 'anyone',
				'role': 'reader'
			},
			fileId: id,
			// fields: 'id',
		});
	}

	async getAssetsForFolder(name) {
		const res = await this.drive.files.list({
			pageSize: 1000,
			q: `'${name}' in parents`,
		});
		const files = res.data.files;
		console.log(files);
		return files;
	}
}
