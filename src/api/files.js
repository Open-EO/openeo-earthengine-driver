const fse = require('fs-extra');
const path = require('path');
const Errors = require('../errors');
const Utils = require('../utils');

// ToDo: This is a mock and only uploads to the driver workspace, but not into the actual Google cloud storage, which would be required to use it in processes.
module.exports = class FilesAPI {

	constructor(context) {
		this.workspace = context.files();
		this.context = context;
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
		var p = this.workspace.getPathFromRequest(req, '.');
		if (!p) {
			return next(new Errors.FilePathInvalid());
		}

		return fse.ensureDir(p)
		.then(() => Utils.walk(path.normalize(p)))
		.then(files => {
			var output = files.map(file => {
				return {
					path: this.workspace.getFileName(req.user._id, file.path),
					size: file.stat.size,
					modified: Utils.getISODateTime(file.stat.mtime)
				}
			});
			res.json( {
				files: output,
				links:[]
			});
			return next();
		})
		.catch(e => next(Errors.wrap(e)));
	}

	putFileByPath(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var p = this.workspace.getPathFromRequest(req);
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
			.catch(err => Promise.reject(Errors.wrap(err)));
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
			});
			req.on('error', (e) => {
				stream.end();
				fse.exists(p).then(() => fse.unlink(p));
				return next(Errors.wrap(e));
			});
			stream.on('close', () => {
				var filePath = this.workspace.getFileName(req.user._id, p);
				const payload = {
					user_id: req.user._id,
					path: filePath,
					action: fileExists ? 'updated' : 'created'
				};
				this.context.subscriptions().publish(req.user._id, 'openeo.files', payload, payload);
				fse.stat(p).then(newFileStat => {
					res.send(200, {
						path: filePath,
						size: newFileStat.size,
						modified: Utils.getISODateTime(newFileStat.mtime)
					});
					return next();
				}).catch(e => {
					if (this.context.debug) {
						console.error(e);
					}
					res.send(200, {
						path: filePath
					});
					return next();
				});
			});
			stream.on('error', (e) => {
				fse.exists(p).then(() => fse.unlink(p));
				return next(Errors.wrap(e));
			});
		})
		.catch(err => next(Errors.wrap(err)));
	}

	deleteFileByPath(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var p = this.workspace.getPathFromRequest(req);
		if (!p) {
			return next(new Errors.FilePathInvalid());
		}

		Utils.isFile(p)
		.then(() => fse.unlink(p))
		.then(() => {
			const payload = {
				user_id: req.user._id,
				path: this.workspace.getFileName(req.user._id, p),
				action: 'deleted'
			};
			this.context.subscriptions().publish(req.user._id, 'openeo.files', payload, payload);
			res.send(204);
			return next();
		})
		.catch(err => next(Errors.wrap(err)));
	}

	getFileByPath(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		var p = this.workspace.getPathFromRequest(req);
		if (!p) {
			return next(new Errors.FilePathInvalid());
		}
		Utils.isFile(p).then(() => {
			let stream = fse.createReadStream(p);
			res.setHeader('Content-Type', 'application/octet-stream');
			stream.pipe(res);
			stream.on('error', (e) => {
				return next(Errors.wrap(e));
			});
			stream.on('close', () => {
				res.end();
				return next();
			});
		})
		.catch(err => next(Errors.wrap(err)));
	}

};
