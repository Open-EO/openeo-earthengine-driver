const Utils = require('./utils');
const fs = require('fs');
const path = require('path');
const Errors = require('./errors');

// ToDo: This is a mock and only uploads to the driver workspace, but not into the actual Google cloud storage, which would be required to use it in processes.
// ToDo: Replace sync calls with async calls.
module.exports = class FilesAPI {

	constructor() {
		this.folder = './storage/user_files';
	}

	beforeServerStart(server) {
		var pathRoutes = ['/files/{user_id}/{path}', '/files/:user_id/*'];
		server.addEndpoint('get', '/files/{user_id}', this.getFiles.bind(this));
		server.addEndpoint('get', pathRoutes, this.getFileByPath.bind(this));
		server.addEndpoint('put', pathRoutes, this.putFileByPath.bind(this));
		server.addEndpoint('delete', pathRoutes, this.deleteFileByPath.bind(this));

		server.createSubscriptions(['openeo.files']);

		return new Promise((resolve, reject) => resolve());
	}

	getFiles(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var p = this.getPathFromRequest(req, '.');
		if (!p) {
			return next(new Errors.FilePathInvalid());
		}

		var files = this.walkSync(path.normalize(p));
		var data = [];
		for(var i in files) {
			let fileName = path.relative(this.getUserFolder(req.user._id), files[i]);
			let stats = fs.statSync(files[i]);
			data.push({
				name: fileName,
				size: stats.size,
				modified: stats.mtime.toISOString()
			});
		}
		res.json({
			files: data,
			links: []
		});
		return next();
	}

	walkSync(dir, filelist) {
		filelist = filelist || [];
		if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
			files = fs.readdirSync(dir);
			files.forEach((file) => {
				let fullPath = path.join(dir, file);
				if (fs.statSync(fullPath).isDirectory()) {
					filelist = this.walkSync(fullPath, filelist);
				}
				else {
					filelist.push(fullPath);
				}
			});
		}
		return filelist;
	}

	putFileByPath(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var p = this.getPathFromRequest(req);
		var fileExists = fs.existsSync(p);
		if (!p || (fileExists && fs.statSync(p).isDirectory())) {
			return next(new Errors.FilePathInvalid());
		}
		let contentType = 'application/octet-stream';
		if (req.contentType() !== contentType) {
			return next(new Errors.ContentTypeInvalid({types: contentType}));
		}

		let parent = path.dirname(p);
		Utils.mkdirSyncRecursive(parent);
	
		var stream = fs.createWriteStream(p);
		req.on('data', (chunk) => {
			stream.write(chunk);
		});
		req.on('end', () => {
			stream.end();
			const payload = {
				user_id: req.user._id,
				path: p.replace('storage/user_files/'+req.user._id+'/', ''),
				action: fileExists ? 'updated' : 'created'
			};
			res.subscriptions.publish('openeo.files', payload, payload);
			res.send(204);
			return next();
		});
		req.on('error', (e) => {
			stream.end();
			if (fs.exists(p)) {
				fs.unlink(p, () => {});
			}
			return next(new Errors.Internal(e));
		});
	}

	deleteFileByPath(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var p = this.getPathFromRequest(req);
		if (!p) {
			return next(new Errors.FilePathInvalid());
		}
		if (fs.existsSync(p) && fs.statSync(p).isFile()) {
			fs.unlink(p, (e) => {
				if (e) {
					return next(new Errors.Internal(e));
				}
				else {
					const payload = {
						user_id: req.user._id,
						path: p.replace('storage/user_files/'+req.user._id+'/', ''),
						action: 'deleted'
					};
					res.subscriptions.publish('openeo.files', payload, payload);
					res.send(204);
					return next();
				}
			});
		}
		else {
			return next(new Errors.FileNotFound());
		}
	}

	getFileByPath(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var p = this.getPathFromRequest(req);
		if (!p) {
			return next(new Errors.FilePathInvalid());
		}
		if (fs.existsSync(p) && fs.statSync(p).isFile()) {
			let stream = fs.createReadStream(p);
			stream.pipe(res);
			stream.on('error', (e) => {
				return next(new Errors.Internal(e));
			});
			stream.on('close', () => {
				res.end();
				return next();
			});
		}
		else {
			return next(new Errors.FileNotFound());
		}
	}

	getUserFolder(user_id) {
		return path.join(this.folder, user_id);
	}

	getPathFromRequest(req, p) {
		if (req.params.user_id != req.user._id) {
			// The authorized user id and the user_id in the path mismatch
			return null;
		}
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

	getFileContentsSync(user_id, p) {
		if (!user_id) {
			return null;
		}
		var p = this.getPath(user_id, p);
		if (!p || !fs.existsSync(p) || !fs.statSync(p).isFile()) {
			return null;
		}

		return fs.readFileSync(p);
	}

};
