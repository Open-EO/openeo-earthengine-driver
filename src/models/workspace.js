import HttpUtils from '../utils/http.js';
import Errors from '../utils/errors.js';
import path from 'path';
import fse from 'fs-extra';

export default class FileWorkspace {

	constructor(folder = './storage/user_files') {
		this.folder = folder;
	}

	getFolder() {
		return this.folder;
	}

	getUserFolder(user_id) {
		return path.join(this.folder, user_id);
	}

	getPathFromRequest(req, p) {
		return this.getPath(req.user._id, (p ? p : req.params['*']));
	}

	getPath(user_id, p) {
		let userFolder = this.getUserFolder(user_id);
		let userPath = path.normalize(userFolder);
		let filePath = path.normalize(path.join(userFolder, p));
		if (filePath.startsWith(userPath)) {
			return filePath;
		}
		return null;
	}

	getFileName(user_id, p) {
		return path.relative(this.getUserFolder(user_id), p).replace(/\\/g, '/');
	}

	async getFileContents(user_id, p) {
		if (!user_id) {
			throw new Errors.FilePathInvalid();
		}
		const path = this.getPath(user_id, p);
		if (!path) {
			throw new Errors.FilePathInvalid();
		}

		await HttpUtils.isFile(path);
		return await fse.readFile(path);
	}

}
