const fse = require('fs-extra');
const path = require('path');
const Errors = require('./errors');
const Utils = require('./utils');

// ToDo: This is a mock and only uploads to the driver workspace, but not into the actual Google cloud storage, which would be required to use it in processes.
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

		return Promise.resolve();
	}

	getFiles(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var p = this.getPathFromRequest(req, '.');
		if (!p) {
			return next(new Errors.FilePathInvalid());
		}

		return fse.ensureDir(p)
		.then(() => Utils.walk(path.normalize(p)))
		.then(files => {
			var output = files.map(file => {
				return {
					name: this.getFileName(req.user._id, file.path),
					size: file.stat.size,
					modified: file.stat.mtime.toISOString()
				}
			});
			res.json( {
				files:output,
				links:[]
			});
			return next();
		})
		.catch(e => next(new Errors.Internal(e)));
	}

	putFileByPath(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var p = this.getPathFromRequest(req);
		if (!p) {
			return next(new Errors.FilePathInvalid());
		}

		return fse.stat(p)
		.catch(() => {
			 // File doesn't exist => not a problem for uploading; create missing folders and continue process chain.
			let parent = path.dirname(p);
			return fse.ensureDir(parent).then(() => {
				return Promise.resolve(null);
			})
			.catch(err => Promise.reject(new Errors.Internal(err)));
		})
		.then(stat => {
			let fileExists = (stat !== null);
			if (fileExists && stat.isDirectory()) {
				throw new Errors.FilePathInvalid();
			}
			let contentType = 'application/octet-stream';
			if (req.contentType() !== contentType) {
				throw new Errors.ContentTypeInvalid( {types:contentType});
			}

			var stream = fse.createWriteStream(p);
			req.on('data', (chunk) => {
				stream.write(chunk);
			});
			req.on('end', () => {
				stream.end();
				const payload = {
					user_id: req.user._id,
					path: this.getFileName(req.user._id, p),
					action: fileExists ? 'updated' : 'created'
				};
				req.api.subscriptions.publish(req.user._id, 'openeo.files', payload, payload);
				res.send(204);
				return next();
			});
			req.on('error', (e) => {
				stream.end();
				fse.exists(p).then(() => fse.unlink(p));
				return next(new Errors.Internal(e));
			});
		})
		.catch(err => next(Errors.wrap(err)));
	}

	deleteFileByPath(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var p = this.getPathFromRequest(req);
		if (!p) {
			return next(new Errors.FilePathInvalid());
		}

		this.isFile(p)
		.then(() => fse.unlink(p))
		.then(() => {
			const payload = {
				user_id: req.user._id,
				path: this.getFileName(req.user._id, p),
				action: 'deleted'
			};
			req.api.subscriptions.publish(req.user._id, 'openeo.files', payload, payload);
			res.send(204);
			return next();
		})
		.catch(err => next(Errors.wrap(err)));
	}

	getFileByPath(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var p = this.getPathFromRequest(req);
		if (!p) {
			return next(new Errors.FilePathInvalid());
		}
		this.isFile(p).then(() => {
			let stream = fse.createReadStream(p);
			res.setHeader('Content-Type', 'application/octet-stream');
			stream.pipe(res);
			stream.on('error', (e) => {
				return next(new Errors.Internal(e));
			});
			stream.on('close', () => {
				res.end();
				return next();
			});
		})
		.catch(err => next(Errors.wrap(err)));
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

	getFileName(user_id, p) {
		return path.relative(this.getUserFolder(user_id), p);
	}

	isFile(path) {
		return fse.stat(path).then(stat => {
			if (stat.isFile()) {
				return Promise.resolve();
			}
			else {
				return Promise.reject(new Errors.FileOperationUnsupported());
			}
		})
		.catch(err => {
			return Promise.reject(new Errors.FileNotFound());
		});
	}

	getFileContents(user_id, p) {
		if (!user_id) {
			return Promise.reject(new Errors.FilePathInvalid());
		}
		var p = this.getPath(user_id, p);
		if (!p) {
			return Promise.reject(new Errors.FilePathInvalid());
		}
		
		return this.isFile(p).then(() => fse.readFile(p));
	}

};
